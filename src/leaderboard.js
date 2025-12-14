import { supabase } from './supabaseClient';

export async function fetchLeaderboard() {
    const today = new Date().toDateString();

    // 1. Fetch ALL progress for today (we need to calculate score client-side)
    const { data: progressData, error: progressError } = await supabase
        .from('daily_progress')
        .select(`
            pushups,
            pullups,
            user_id
        `)
        .eq('date_key', today);

    if (progressError) {
        console.error('Error fetching leaderboard:', progressError);
        return [];
    }

    if (!progressData || progressData.length === 0) return [];

    // 2. Calculate scores and sort
    const rankedData = progressData.map(entry => ({
        ...entry,
        score: (entry.pushups || 0) + (entry.pullups || 0) * 2
    }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    // 3. Fetch nicknames for the top 10
    const userIds = rankedData.map(p => p.user_id);
    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);

    if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
    }

    // 4. Merge data
    const leaderboard = rankedData.map(entry => {
        const profile = profilesData?.find(p => p.id === entry.user_id);
        return {
            nickname: profile ? profile.nickname : 'Anonim',
            pushups: entry.pushups || 0,
            pullups: entry.pullups || 0,
            score: entry.score
        };
    });

    return leaderboard;
}

// ... existing imports

export async function createProfile(userId, nickname) {
    const { error } = await supabase
        .from('profiles')
        .upsert([{ id: userId, nickname: nickname }], { onConflict: 'id' });

    if (error) console.error('Error creating/updating profile:', error);
}

export async function fetchStreakLeaderboard() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, current_streak')
        .order('current_streak', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching streak leaderboard:', error);
        return [];
    }

    return data.map(entry => ({
        nickname: entry.nickname || 'Anonim',
        score: entry.current_streak, // Reusing 'score' property for generic compatibility
        isStreak: true
    }));
}

export async function updateStreak(userId) {
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    // 1. Get current profile state
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !profile) return;

    // Check if already updated today
    if (profile.last_goal_met_date === today) {
        return; // Already counted for today
    }

    let newCurrentStreak = 1;
    // Check if streak continues (last met date was yesterday)
    if (profile.last_goal_met_date === yesterday) {
        newCurrentStreak = (profile.current_streak || 0) + 1;
    } else {
        // Streak broken or new start
        newCurrentStreak = 1;
    }

    const newLongestStreak = Math.max(profile.longest_streak || 0, newCurrentStreak);

    // 2. Update profile
    await supabase
        .from('profiles')
        .update({
            current_streak: newCurrentStreak,
            longest_streak: newLongestStreak,
            last_goal_met_date: today
        })
        .eq('id', userId);
}

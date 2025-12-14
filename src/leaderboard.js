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

export async function createProfile(userId, nickname) {
    const { error } = await supabase
        .from('profiles')
        .upsert([{ id: userId, nickname: nickname }], { onConflict: 'id' });

    if (error) console.error('Error creating/updating profile:', error);
}

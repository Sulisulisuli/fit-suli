import { supabase } from './supabaseClient';

export async function fetchLeaderboard() {
    const today = new Date().toDateString();

    // 1. Fetch top progress for today
    const { data: progressData, error: progressError } = await supabase
        .from('daily_progress')
        .select(`
            pushups,
            pullups,
            user_id
        `)
        .eq('date_key', today)
        .order('pushups', { ascending: false })
        .limit(10);

    if (progressError) {
        console.error('Error fetching leaderboard:', progressError);
        return [];
    }

    if (!progressData || progressData.length === 0) return [];

    // 2. Fetch nicknames for these users
    const userIds = progressData.map(p => p.user_id);
    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);

    if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
    }

    // 3. Merge data
    const leaderboard = progressData.map(entry => {
        const profile = profilesData?.find(p => p.id === entry.user_id);
        return {
            nickname: profile ? profile.nickname : 'Anonim',
            pushups: entry.pushups || 0,
            pullups: entry.pullups || 0,
            score: (entry.pushups || 0) + (entry.pullups || 0) * 2 // Example score calculation
        };
    });

    // Sort by total score (optional, currently sorted by pushups from query)
    return leaderboard;
}

export async function createProfile(userId, nickname) {
    const { error } = await supabase
        .from('profiles')
        .insert([{ id: userId, nickname: nickname }]);

    if (error) console.error('Error creating profile:', error);
}

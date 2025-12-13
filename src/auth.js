
import { supabase } from './supabaseClient'

export const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
    })
    if (error) console.error('Error logging in:', error)
    return { data, error }
}

export const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })
    return { data, error }
}

export const signUpWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })
    return { data, error }
}

export const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error logging out:', error)
}

export const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export const onAuthStateChange = (callback) => {
    return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null)
    })
}

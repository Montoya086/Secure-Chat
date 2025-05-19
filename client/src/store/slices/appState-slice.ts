// appState-slice.ts

import { createSlice } from '@reduxjs/toolkit';

interface AppState {
    state: 'LOGGED_IN' | 'NOT_LOGGED_IN'
    mfaEnabled: boolean
    mfaCompleted: boolean
}

const initialState: AppState = {
    state: 'NOT_LOGGED_IN',
    mfaEnabled: false,
    mfaCompleted: false,
}

const appStateSlice = createSlice({
    name: 'appState',
    initialState,
    reducers: {
        setAppState: (state, action) => {
            state.state = action.payload;
        },
        setMfaEnabled: (state, action) => {
            state.mfaEnabled = action.payload;
        },
        setMfaCompleted: (state, action) => {
            state.mfaCompleted = action.payload;
        },
    },
})

export const { setAppState, setMfaEnabled, setMfaCompleted } = appStateSlice.actions;
export default appStateSlice.reducer;
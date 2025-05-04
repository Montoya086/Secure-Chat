// appState-slice.ts

import { createSlice } from '@reduxjs/toolkit';

interface AppState {
    state: 'LOGGED_IN' | 'NOT_LOGGED_IN'
}

const initialState: AppState = {
    state: 'NOT_LOGGED_IN',
}

const appStateSlice = createSlice({
    name: 'appState',
    initialState,
    reducers: {
        setAppState: (state, action) => {
            state.state = action.payload;
        },
    },
})

export const { setAppState } = appStateSlice.actions;
export default appStateSlice.reducer;
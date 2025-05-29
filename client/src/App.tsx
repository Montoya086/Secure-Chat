import { RouterProvider } from 'react-router-dom';
import router from './navigations/AppNavigator';
import './App.css';
import { useEffect } from 'react';
import { setAppState, setMfaEnabled } from './store/slices/appState-slice';
import Cookies from 'js-cookie';
import { useDispatch, useSelector } from 'react-redux';
import { TOKEN_COOKIE_NAME } from './utils/constants';
import MfaModal from './components/MfaModal';
import { RootState } from './store/store';
import { validateMfaStatus } from './utils/validateMfaStatus';

const App = () => {
  const dispatch = useDispatch();
  const mfaCompleted = useSelector((state: RootState) => state.appState.mfaCompleted);
  const appState = useSelector((state: RootState) => state.appState.state);

  useEffect(() => {
    const token = Cookies.get(TOKEN_COOKIE_NAME);
    if (token) {
      const mfaEnabled = validateMfaStatus(token);
      dispatch(setMfaEnabled(mfaEnabled));
      dispatch(setAppState('LOGGED_IN'));
    }
  }, [dispatch]);

  return (
    <>
      <RouterProvider router={router} />
      <MfaModal isOpen={!mfaCompleted && appState === 'LOGGED_IN'} />
    </>
  );
}

export default App;

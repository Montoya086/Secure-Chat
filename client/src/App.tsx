import { RouterProvider } from 'react-router-dom';
import router from './navigations/AppNavigator';
import './App.css';
import { useEffect } from 'react';
import { setAppState } from './store/slices/appState-slice';
import Cookies from 'js-cookie';
import { useDispatch } from 'react-redux';
import { TOKEN_COOKIE_NAME } from './utils/constants';

const App = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    const token = Cookies.get(TOKEN_COOKIE_NAME);
    if (token) {
      dispatch(setAppState('LOGGED_IN'));
    }
  }, [dispatch]);
  return <RouterProvider router={router} />;
}

export default App;

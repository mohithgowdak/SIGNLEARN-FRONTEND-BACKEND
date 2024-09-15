import firebase from "firebase/compat/app";
import { auth } from "../../firebase";
import Cookies from 'js-cookie';

import {
  LOAD_PROF,
  LOGIN_FAIL,
  LOGIN_REQ,
  LOGIN_SUCCESS,
  LOGOUT,
} from "../action-types";

export const login = () => async (dispatch) => {
  try {
    dispatch({
      type: LOGIN_REQ,
    });

    //const provider = new firebase.auth.GoogleAuthProvider();
    
    //const res = await auth.signInWithPopup(provider);
    var res = await firebase.auth().signInWithPopup(
      new firebase.auth.GoogleAuthProvider());
    const accessToken = res.credential.accessToken;

    const profile = {
      name: res.additionalUserInfo.profile.name,
      photoURL: res.additionalUserInfo.profile.picture,
      userId: res.additionalUserInfo.profile.id,
    };
    
// stores access token 
    Cookies.set('sign-language-ai-access-token', accessToken, { expires: 2 });// expires in 2 days
//  stores user information as json string   
    Cookies.set('sign-language-ai-user', JSON.stringify(profile) , { expires: 2 })

    dispatch({
      type: LOGIN_SUCCESS,
      payload: accessToken,
    });

    dispatch({
      type: LOAD_PROF,
      payload: profile,
    });
  } catch (error) {
    dispatch({
      type: LOGIN_FAIL,
      payload: error.message,
    });
  }
};


export const logout = () => async dispatch =>{

    await auth.signOut()

    dispatch({
        type: LOGOUT
    }) 

    Cookies.remove('sign-language-ai-access-token');
    Cookies.remove('sign-language-ai-user');
}

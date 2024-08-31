import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc, where, query } from "firebase/firestore";
import {
  ADD_SIGN_DATA_FAIL,
  ADD_SIGN_DATA_REQ,
  ADD_SIGN_DATA_SUCCESS,
  GET_SIGN_DATA_FAIL,
  GET_SIGN_DATA_REQ,
  GET_SIGN_DATA_SUCCESS,
  GET_TOP_USERS_FAIL,
  GET_TOP_USERS_REQ,
  GET_TOP_USERS_SUCCESS,
} from "../action-types";
import Cookies from "js-cookie";

export const getSignData = () => async (dispatch) => {
  let signData = [];
  // extracting the details from cookies
  const logedInUser = JSON.parse(Cookies.get("sign-language-ai-user"));

  async function getData(db) {
    const noteCol = collection(db, "SignData");
    const userSpecificData = query(noteCol, where("userId", "==", logedInUser.userId));// extracting only user id data
    const noteSnapshot = await getDocs(userSpecificData);
    const data = noteSnapshot.docs.map((doc) => doc.data());
    return data;
  }

  try {
    dispatch({ type: GET_SIGN_DATA_REQ });
    signData = await getData(db);
    dispatch({ type: GET_SIGN_DATA_SUCCESS, payload: signData });
  } catch (error) {
    dispatch({
      type: GET_SIGN_DATA_FAIL,
      payload: error.message || "Failed to get sign data",
    });
  }
};

export const addSignData = (data) => async (dispatch) => {
  try {
    dispatch({ type: ADD_SIGN_DATA_REQ });
    await setDoc(doc(db, "SignData", data.id), { // for each user a new documented is being created
      userId: data.userId,
      id: data.id,
      username: data.username,
      createdAt: data.createdAt,
      signsPerformed: data.signsPerformed,
      secondsSpent: data.secondsSpent,
    });
    dispatch({ type: ADD_SIGN_DATA_SUCCESS, payload: data });
  } catch (error) {
    dispatch({
      type: ADD_SIGN_DATA_FAIL,
      payload: error.message || "Failed to add sign data",
    });
  }
};

export const getTopUsers = () => async (dispatch) => {
  let allData = [];
  async function getData(db) {
    const noteCol = collection(db, "SignData");
    const noteSnapshot = await getDocs(noteCol);
    const data = noteSnapshot.docs.map((doc) => doc.data());
    return data;
  }

  try {
    dispatch({ type: GET_TOP_USERS_REQ });
    allData = await getData(db);

    const groupedData = allData.reduce((acc, curr) => { // grouping based on username
      if (!acc[curr.username]) {
        acc[curr.username] = [];
      }
      acc[curr.username].push(curr);
      return acc;
    }, {});

    let uniqueData = Object.values(groupedData).map((group) => {
      return group.reduce((maxObj, obj) => {
        const totalSignsMaxObj = maxObj.signsPerformed.reduce((acc, curr) => acc + curr.count, 0);
        const totalSignsObj = obj.signsPerformed.reduce((acc, curr) => acc + curr.count, 0);
        return totalSignsObj > totalSignsMaxObj ? obj : maxObj;
      });
    });

    uniqueData.sort((a, b) => {
      const totalSignsA = a.signsPerformed.reduce((acc, curr) => acc + curr.count, 0);
      const totalSignsB = b.signsPerformed.reduce((acc, curr) => acc + curr.count, 0);
      return totalSignsB - totalSignsA;
    });

    const topThreeUsers = uniqueData.slice(0, 3).map((obj, index) => ({
      username: obj.username,
      rank: index + 1,
    }));

    dispatch({ type: GET_TOP_USERS_SUCCESS, payload: topThreeUsers });
  } catch (error) {
    dispatch({
      type: GET_TOP_USERS_FAIL,
      payload: error.message || "Failed to get top users",
    });
  }
};

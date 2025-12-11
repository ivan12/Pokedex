import { useCallback, useEffect, useState } from "react";
import { app } from "@/lib/firebase";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  signInWithRedirect,
  updateProfile,
} from "firebase/auth";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (
        err?.code === "auth/popup-blocked" ||
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/network-request-failed"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const updateDisplayName = useCallback(async (newName) => {
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: newName });
    setUser({ ...auth.currentUser });
  }, []);

  return { user, authLoading, loginWithGoogle, logout, updateDisplayName };
};

export default useAuth;

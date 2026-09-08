"use server";

import { signIn as authSignIn, signOut as authSignOut } from "@/lib/auth";

export async function signInAction() {
  await authSignIn("discord");
}

export async function signOutAction() {
  await authSignOut({ redirectTo: "/" });
}

"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function saveImageToBase64(value: FormDataEntryValue | null) {
  // Accept a pre-cropped base64 data URL (submitted from the banner crop canvas)
  if (typeof value === "string") {
    if (!value.startsWith("data:image/")) return undefined; // empty or invalid string
    return value;
  }

  // Otherwise handle a raw File upload (profile background)
  if (!(value instanceof File) || value.size === 0) return undefined;
  if (!value.type.startsWith("image/") || value.size > 8 * 1024 * 1024) return undefined;

  const bytes = await value.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:${value.type};base64,${base64}`;
}

export async function updateProfileAppearance(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const [profileBackground, profileBanner] = await Promise.all([
    saveImageToBase64(formData.get("profileBackground")),
    saveImageToBase64(formData.get("profileBanner")),
  ]);

  await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(profileBackground !== undefined ? { profileBackground } : {}),
      ...(profileBanner !== undefined ? { profileBanner } : {}),
    },
  });

  revalidatePath("/profile");
  revalidatePath(`/members/${session.user.id}`);
}

"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function saveImage(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return undefined;
  if (!value.type.startsWith("image/") || value.size > 8 * 1024 * 1024) return undefined;

  const extension = value.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
  const filename = `${crypto.randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", "profiles");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), Buffer.from(await value.arrayBuffer()));
  return `/uploads/profiles/${filename}`;
}

export async function updateProfileAppearance(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const [profileBackground, profileBanner] = await Promise.all([
    saveImage(formData.get("profileBackground")),
    saveImage(formData.get("profileBanner")),
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
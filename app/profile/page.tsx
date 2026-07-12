import Link from "next/link";
import { SignOutControl } from "@/components/auth/sign-out-control";
import { FileUploadControl } from "@/components/files/file-upload-control";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireSession } from "@/server/auth/session";
import { getProfile, listProfileFiles } from "@/server/services/profiles";

export const dynamic = "force-dynamic
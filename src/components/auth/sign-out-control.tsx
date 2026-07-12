import { signOutAction } from "@/server/actions/auth/sign-in";

type SignOutControlProps = {
  label?: string;
};

export function SignOutControl({ label = "Sign out" }: SignOutControlProps) {
  return (
    <form action={signOutAction}>
      <button className="secondary-button" type="submit">
        {label}
      </button>
    </form>
  );
}

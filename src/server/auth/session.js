import { getServerSession } from "next-auth";
import { authOptions } from "@/src/server/auth/options";
import { ApiError } from "@/src/server/http/errors";
import { getProfile, isAdminUser } from "@/src/server/services/authService";

export const getAuthUser = async () => {
  const session = await getServerSession(authOptions);
  const user = session?.user || null;
  if (!user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  const profile = await getProfile(user.id);
  const isAdmin = await isAdminUser(user.id);

  return {
    session,
    user: {
      id: user.id,
      email: user.email || null,
      name: user.name || null,
    },
    profile,
    isAdmin,
  };
};

export const requireTeacher = async () => getAuthUser();

export const requireAdmin = async () => {
  const authUser = await getAuthUser();
  if (!authUser.isAdmin) {
    throw new ApiError(403, "Admin access required");
  }
  return authUser;
};

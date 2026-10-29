// The teacher port over Kindling's API, through the generated client.
import {
  type Class as ApiClass,
  createClass,
  getAccount,
  getClasses,
  getDashboard,
  signIn,
  signOut,
} from "@repo/api-client";
import {
  type Class,
  type ClassGrade,
  CredentialRejected,
  type TeacherPort,
} from "../ports.ts";

export function apiTeacherPort(options: {
  /** The site the API's link paths are on, e.g. "https://kindling.ca". */
  origin: string;
}): TeacherPort {
  /** The API's class, with its link paths made into URLs to share. */
  function toClass({ joinPath, games, grades, ...rest }: ApiClass): Class {
    return {
      ...rest,
      grades: grades as ClassGrade[],
      joinLink: new URL(joinPath, options.origin).href,
      games: games.map(({ path, ...game }) => ({
        ...game,
        link: new URL(path, options.origin).href,
      })),
    };
  }

  return {
    async account() {
      const res = await getAccount();
      if (res.status !== 200) throw unexpected("account", res.status);
      return res.data;
    },
    async signIn(credential) {
      const res = await signIn({ credential, as: "teacher" });
      if (res.status === 200) return res.data.account;
      if (res.status === 401) throw new CredentialRejected();
      // The client's types only know the statuses the API documents.
      throw unexpected("sign-in", (res as { status: number }).status);
    },
    async signOut() {
      const res = await signOut();
      if (res.status !== 204) throw unexpected("sign-out", res.status);
    },
    async classes() {
      const res = await getClasses();
      if (res.status !== 200) throw unexpected("classes", res.status);
      return res.data.map(toClass);
    },
    async createClass(draft) {
      const res = await createClass(draft);
      if (res.status !== 201)
        throw unexpected("create class", (res as { status: number }).status);
      return toClass(res.data);
    },
    async dashboard(classId) {
      const res = await getDashboard(classId);
      if (res.status !== 200) throw unexpected("dashboard", res.status);
      return res.data;
    },
  };
}

function unexpected(call: string, status: number) {
  return new Error(`[teach] The API answered ${call} with ${status}`);
}

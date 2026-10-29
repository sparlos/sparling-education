// The teacher port over Kindling's API, through the generated client.
import {
  type Class as ApiClass,
  createClass,
  getAccount,
  getClass,
  getClassStudents,
  getClasses,
  getDashboard,
  getEvidence,
  getPlay,
  removeStudent,
  setStudentGrade,
  signIn,
  signOut,
  switchGame,
} from "@repo/api-client";
import {
  type Class,
  type ClassGrade,
  CredentialRejected,
  NotFound,
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
    async class(classId) {
      const res = await getClass(classId);
      if (res.status !== 200) throw unexpected("class", res.status);
      return toClass(res.data);
    },
    async switchGame(classId, slug, on) {
      const res = await switchGame(classId, slug, { on });
      if (res.status !== 200) throw unexpected("switch game", res.status);
      return toClass(res.data);
    },
    async students(classId) {
      const res = await getClassStudents(classId);
      if (res.status !== 200) throw unexpected("students", res.status);
      return res.data;
    },
    async setStudentGrade(classId, studentId, grade) {
      const res = await setStudentGrade(classId, studentId, { grade });
      if (res.status === 200) return res.data;
      // Here a 400 is a grade the class hasn't got, not a made-up ID.
      if (res.status === 400 && res.data.error === "not-a-class-grade")
        throw new Error(`[teach] Grade ${grade} isn't one of the class's`);
      throw unexpected("student grade", res.status);
    },
    async removeStudent(classId, studentId) {
      const res = await removeStudent(classId, studentId);
      if (res.status !== 204) throw unexpected("remove student", res.status);
    },
    async dashboard(classId) {
      const res = await getDashboard(classId);
      if (res.status !== 200) throw unexpected("dashboard", res.status);
      return res.data;
    },
    async evidence(classId, studentId, expectationId) {
      const res = await getEvidence(classId, studentId, expectationId);
      if (res.status !== 200) throw unexpected("evidence", res.status);
      return res.data;
    },
    async play(classId, studentId, playId) {
      const res = await getPlay(classId, studentId, playId);
      if (res.status !== 200) throw unexpected("play", res.status);
      return res.data;
    },
  };
}

function unexpected(call: string, status: number) {
  // A made-up ID that isn't even a UUID fails the API's validation with a
  // 400, before it can answer 404; to the teacher, both are "not found".
  if (status === 404 || status === 400) return new NotFound(call);
  return new Error(`[teach] The API answered ${call} with ${status}`);
}

import {
  dashboardContract,
  managingContract,
  recognitionContract,
  type TeacherPortHarness,
  teacherPortContract,
} from "../contract.ts";
import { fakeTeacherBackend } from "./teacher.ts";

function harness(): TeacherPortHarness {
  let now = new Date();
  return {
    ...fakeTeacherBackend({ now: () => now }),
    setNow: (at) => {
      now = at;
    },
  };
}

teacherPortContract("Fake teacher port", harness);
dashboardContract("Fake teacher port", harness);
managingContract("Fake teacher port", harness);
recognitionContract("Fake teacher port", harness);

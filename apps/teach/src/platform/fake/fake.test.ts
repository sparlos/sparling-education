import {
  dashboardContract,
  demoClassContract,
  managingContract,
  recognitionContract,
  type TeacherPortHarness,
  teacherPortContract,
} from "../contract.ts";
import { fakeTeacherBackend } from "./teacher.ts";

function harness(demoClass = false): TeacherPortHarness {
  let now = new Date();
  return {
    ...fakeTeacherBackend({ now: () => now, demoClass }),
    setNow: (at) => {
      now = at;
    },
  };
}

teacherPortContract("Fake teacher port", harness);
dashboardContract("Fake teacher port", harness);
managingContract("Fake teacher port", harness);
recognitionContract("Fake teacher port", harness);
demoClassContract("Fake teacher port", () => harness(true));

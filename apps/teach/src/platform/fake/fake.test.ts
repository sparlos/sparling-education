import {
  dashboardContract,
  managingContract,
  teacherPortContract,
} from "../contract.ts";
import { fakeTeacherBackend } from "./teacher.ts";

teacherPortContract("Fake teacher port", () => fakeTeacherBackend());
dashboardContract("Fake teacher port", () => fakeTeacherBackend());
managingContract("Fake teacher port", () => fakeTeacherBackend());

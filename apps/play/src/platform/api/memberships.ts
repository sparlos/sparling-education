// The memberships port over the platform's API, through the generated client.
import { joinClass, pickGrade } from "@repo/api-client";
import { type MembershipsPort, NoSuchClass } from "../ports.ts";
import { unexpected } from "./unexpected.ts";

export function apiMemberships(): MembershipsPort {
  return {
    async join(joinCode) {
      const res = await joinClass({ joinCode });
      if (res.status === 200) return res.data;
      if (res.status === 404) throw new NoSuchClass();
      throw unexpected("join", res.status);
    },
    async pickGrade(classId, grade) {
      const res = await pickGrade(classId, { grade });
      if (res.status !== 200) throw unexpected("pick grade", res.status);
      return res.data;
    },
  };
}

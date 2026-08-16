import type { AmPerson } from "@/lib/amActivity";

export const AM_ASSIGNEE_FULL_NAMES = [
  "Lê Hữu Duyên",
  "Lê Đình Sơn",
  "Trần Nhựt Quang",
  "Trịnh Phước Tùng"
] as const;

const normalizePersonName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");

const AM_ASSIGNEE_NAME_KEYS = new Set(
  AM_ASSIGNEE_FULL_NAMES.map(normalizePersonName)
);

export const isAmAssignee = (person: Pick<AmPerson, "fullName">): boolean =>
  AM_ASSIGNEE_NAME_KEYS.has(normalizePersonName(person.fullName));

export const getAmAssigneeOptions = (people: readonly AmPerson[]): AmPerson[] => {
  const personByName = new Map(
    people.map((person) => [normalizePersonName(person.fullName), person])
  );

  return AM_ASSIGNEE_FULL_NAMES.map((name) =>
    personByName.get(normalizePersonName(name))
  ).filter((person): person is AmPerson => Boolean(person));
};

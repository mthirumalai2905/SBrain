/** The reasons offered on the contact form. They live in the CMS (the "Contact form" section); setTopics() fills this list. */
export type ContactTopic = string;
export const CONTACT_TOPICS: string[] = [];
export function setTopics(list: string[]) {
  CONTACT_TOPICS.splice(0, CONTACT_TOPICS.length, ...list);
}

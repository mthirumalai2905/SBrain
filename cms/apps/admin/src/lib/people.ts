/** "Vijaykumar Dudhbhate" -> "VD" */
export const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '?') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
};

/** Until real sign-in is added, the local admin account shows this address. */
export const shownEmail = (email: string) => (email.endsWith('@localhost') ? 'vj@synx.tools' : email);

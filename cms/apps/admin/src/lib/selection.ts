/**
 * The document currently picked in Structure, so Live preview can open on the same one (there is no separate page picker
 * in Live preview). The key is an entry id, or "type:<id>" for a single document that has no entry yet.
 */
let selected: string | undefined;
export const setSelectedDoc = (key: string | undefined) => { selected = key; };
export const getSelectedDoc = () => selected;

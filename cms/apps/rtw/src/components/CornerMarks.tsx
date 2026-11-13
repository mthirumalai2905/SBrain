export function CornerMarks() {
  const arm = "corner-mark pointer-events-none absolute z-20 h-[18px] w-[18px] border-solid";
  return (
    <>
      <span className={`${arm} left-1.5 top-1.5 border-l-[1.5px] border-t-[1.5px]`} />
      <span className={`${arm} right-1.5 top-1.5 border-r-[1.5px] border-t-[1.5px]`} />
      <span className={`${arm} bottom-1.5 left-1.5 border-b-[1.5px] border-l-[1.5px]`} />
      <span className={`${arm} bottom-1.5 right-1.5 border-b-[1.5px] border-r-[1.5px]`} />
    </>
  );
}

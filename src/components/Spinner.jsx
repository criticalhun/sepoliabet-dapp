export default function Spinner() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-brand-500/20"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 animate-spin"></div>
      </div>
    </div>
  );
}

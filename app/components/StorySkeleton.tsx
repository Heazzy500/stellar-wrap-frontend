export const StorySkeleton = () => {
  return (
    <div className="w-full h-full bg-gray-900 animate-pulse flex items-center justify-center">
      {/* Add a subtle loading spinner or brand icon here if desired */}
      <div className="w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

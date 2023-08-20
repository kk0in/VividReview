export default function Page() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow flex flex-row">
        <div className="flex-1 bg-red-300 p-4">Video Section</div>
        <div className="flex-1 bg-red-300 p-4">Pose Estimation</div>
        <div className="flex-1 bg-red-300 p-4">Table</div>
      </div>
      <div className="flex-grow bg-yellow-300 p-4">Video Timeline</div>
    </div>
  )
}
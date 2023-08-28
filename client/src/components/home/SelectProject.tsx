"use client";

type SelectProjectProps = {
  setView: React.Dispatch<React.SetStateAction<string>>;
};

export default function SelectProject({ setView }: SelectProjectProps) {
  return (
    <div>
      <div className="flex items-center justify-center gap-10">
        <button
          className="flex flex-col items-center justify-center border rounded-md border-gray-200 p-4 w-80 hover:shadow-md transition duration-200"
          onClick={() => setView("existing")}
        >
          <div className="text-center">Load Existing Project</div>
        </button>
        <button
          className="flex flex-col items-center justify-center border rounded-md border-gray-200 p-4 w-80 hover:shadow-md transition duration-200"
          onClick={() => setView("add")}
        >
          <div className="text-center">Add New Project</div>
        </button>
      </div>
      <div className="flex mt-10">
        {/* <button
          className="mx-auto bg-slate-700 py-2 px-3 text-white rounded-md shadow-md hover:bg-slate-600"
          onClick={fetchData}
        >
          {isFetching ? "FETCHING..." : "TEST MODE"}
        </button> */}
      </div>
    </div>
  );
}

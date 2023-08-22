"use client"

import Image from 'next/image'
import Link from 'next/link'
import { VideoCameraIcon, TableCellsIcon } from '@heroicons/react/24/solid'
import { FormEvent } from 'react'
import FileUpload from '@/components/FileUploader'
import Papa from 'papaparse'
import { useRecoilState } from 'recoil'
import { csvDataState } from './recoil/csvDataState'

export default function Home() {

  const [csvData, setCSVData] = useRecoilState(csvDataState);

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    console.log(e.currentTarget)
  }

  const handleFileUploaded = (file: File) => {
    if (file.type === 'video/mp4') {
      console.log('mp4')
      }
    
    else if (file.type === 'text/csv') {
      console.log('csv')

      // save file to /public folder of client
      const reader = new FileReader()
      reader.readAsText(file)
      reader.onload = function () {
        console.log(reader.result)
        let results = Papa.parse(reader.result as string, {header: true})

        console.log(results)

        setCSVData(results.data)
    }
  }
  };

  // const handleRemoteFile = () => {
  //   readRemoteFile(csvFilePath, {
  //     complete: (results: any) => {
  //       console.log(csvData);
  //       setCSVData(results.data);
  //     },
  //     download: true,
  //     header: true,
  //   });
  // };

  return (
    <div className="flex h-full flex-col items-center justify-between px-24 py-8 bg-slate-700 overflow-auto">
      <div className="relative flex place-items-center ">
        <div>
          <div className='rounded overflow-hidden shadow-lg px-12 py-8 bg-white min-w-[80rem]'>
            {/* GBM, Product, Plant, Route, 작업내용 */}
            <form onSubmit={handleSubmit}>
              <div className='mb-6'>
                <h3 className="text-lg font-bold text-gray-900">Add new project</h3>
                <h4 className="text-sm font-medium text-gray-500">Project information</h4>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-x-6 gap-y-6 sm:grid-cols-4">
                <div className="sm:col-span-1">
                  <label htmlFor="GBM" className="block text-sm font-medium leading-6 text-gray-900">
                    GBM
                  </label>
                  <div className="mt-2">
                    <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                      <input
                        type="text"
                        name="GBM"
                        id="GBM"
                        autoComplete="GBM"
                        disabled
                        className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 disabled:bg-slate-100 rounded-md disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="Product" className="block text-sm font-medium leading-6 text-gray-900">
                    Product
                  </label>
                  <div className="mt-2">
                    <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                      <input
                        type="text"
                        name="product"
                        id="product"
                        disabled
                        autoComplete="product"
                        className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 disabled:bg-slate-100 rounded-md disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="Plant" className="block text-sm font-medium leading-6 text-gray-900">
                    Plant
                  </label>
                  <div className="mt-2">
                    <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                      <input
                        type="text"
                        name="plant"
                        id="plant"
                        disabled
                        autoComplete="plant"
                        className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 disabled:bg-slate-100 rounded-md disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="Route" className="block text-sm font-medium leading-6 text-gray-900">
                    Route
                  </label>
                  <div className="mt-2">
                    <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                      <input
                        type="text"
                        name="route"
                        id="route"
                        disabled
                        autoComplete="route"
                        className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 disabled:bg-slate-100 rounded-md disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="work-description" className="block text-sm font-medium leading-6 text-gray-900">
                    작업내용
                  </label>
                  <div className="mt-2">
                    <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600">
                      <input
                        type="text"
                        name="work-description"
                        id="work-description"
                        disabled
                        autoComplete="work-description"
                        className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 disabled:bg-slate-100 rounded-md disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                </div>
                <div className="col-span-full">
                  <label htmlFor="video" className="block text-sm font-medium leading-6 text-gray-900">
                    Video
                  </label>
                  <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25">
                  <FileUpload onFileUploaded={handleFileUploaded} filetype='mp4'/>

                    {/* <div className="text-center">
                      <VideoCameraIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                      <div className="mt-4 flex text-sm leading-6 text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                        >
                          <span>Upload a file</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs leading-5 text-gray-600">MP4 File</p>
                    </div> */}
                  </div>
                </div>
                <div className="col-span-full">
                  <label htmlFor="csv" className="block text-sm font-medium leading-6 text-gray-900">
                    CSV
                  </label>
                  <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25">
                    <FileUpload onFileUploaded={handleFileUploaded} filetype='csv'/>
                    {/* <div className="text-center">
                      <TableCellsIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                      <div className="mt-4 flex text-sm leading-6 text-gray-600">
                        <label
                          htmlFor="csv-file-upload"
                          className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                        >
                          <span>Upload a file</span>
                          <input id="csv-file-upload" name="csv-file-upload" type="file" className="sr-only" />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs leading-5 text-gray-600">CSV (UTF-8) File</p>
                    </div> */}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-x-6">
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  onClick={() => {console.log(csvData)}}
                >
                  {/* <Link href="/dashboard">Submit</Link> */}
                  Submit
                </button>
              </div>
            </form>
            <div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

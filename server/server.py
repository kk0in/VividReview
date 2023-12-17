from fastapi import FastAPI, UploadFile, Form, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from concurrent.futures import ThreadPoolExecutor

from model.test import run_inference

from typing import Any
from fastapi.responses import StreamingResponse

import zipfile
import shutil
import json
import os
import numpy as np 
import csv
import io



app = FastAPI()

executor = ThreadPoolExecutor(10)

origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

VIDEO = './videos'
KEYPOINT = './keypoints'
FEATURE_VECTOR = './feature_vectors'
RESULT = './results'
META_DATA = './metadata'
VOTING_TABLE = './voting_table'
CONFIDENCE_TABLE = './confidence_table'


os.makedirs(VIDEO, exist_ok=True)
os.makedirs(META_DATA, exist_ok=True)
os.makedirs(KEYPOINT, exist_ok=True)
os.makedirs(FEATURE_VECTOR, exist_ok=True)
os.makedirs(RESULT, exist_ok=True)

confidence_threshold = 0.5
labels = ['M3', 'G1', 'M1', 'M2', 'P2', 'R2', 'A2', 'BG']

def process_video(metadata_file_path, video_file_path):
    run_inference(video_file_path)

    with open(metadata_file_path, 'r') as f:
        data = json.load(f)

    data['done'] = True

    with open(metadata_file_path, 'w') as file:
        json.dump(data, file)

    print("done")

def issue_id():
    metadata_list = [file for file in os.listdir(META_DATA) if file.endswith('.json')]
    if metadata_list:
        ids = [int(file.split('_')[0]) for file in metadata_list]
        return max(ids) + 1
    
    else:
        return 1
    
def issue_version(project_id):
    result_list = [file for file in os.listdir(RESULT) if file.startswith(f'{project_id}_') and file.endswith('.json')]
    if result_list:
        versions = [int(file.split('_')[-1].split('.')[0]) for file in result_list]
        return max(versions) + 1
    else:
        return 1
    
def get_filename(id):
    metadata_list = [file for file in os.listdir(META_DATA) if file.endswith('.json')]
    if metadata_list:
        for file in metadata_list:
            if file.startswith(f'{id}_'):
                # if file name is 1_0707_MX_0002_TEST.json, return 0707_MX_0002_TEST
                fn = os.path.basename(file).split('.')[0].split('_')[1:]
                fn = '_'.join(fn)
                return fn
    else:
        return None

@app.get('/api/get_project', status_code=200)
async def get_project():
    metadata_list = [file for file in os.listdir(META_DATA) if file.endswith('.json')]
    project_list = []

    for metadata in metadata_list:
        with open(os.path.join(META_DATA, metadata), 'r') as f:
            project_list.append(json.load(f))

    project_list.sort(key=lambda x: x['id'])

    return {"projects": project_list}

@app.get('/api/get_project/{project_id}', status_code=200)
async def get_project(project_id: int):
    metadata_file = [file for file in os.listdir(META_DATA) if file.startswith(f'{project_id}_') and file.endswith('.json')]

    if not metadata_file:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if len(metadata_file) > 1:
        raise HTTPException(status_code=500, detail="Multiple projects found")
    else:
        with open(os.path.join(META_DATA, metadata_file[0]), 'r') as f:
            return {"project": json.load(f)}
        
@app.get('/api/get_video/{project_id}', status_code=200)
async def get_video(project_id: int):
    video_file = [file for file in os.listdir(VIDEO) if file.startswith(f'{project_id}_') and file.endswith('.mp4')]

    if not video_file:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if len(video_file) > 1:
        raise HTTPException(status_code=500, detail="Multiple videos found")
    else:
        return FileResponse(os.path.join(VIDEO, video_file[0]), media_type='video/mp4')
    
@app.get('/api/get_keypoint/{project_id}', status_code=200)
async def get_keypoint(project_id: int):
    keypoint_file = [file for file in os.listdir(KEYPOINT) if file.startswith(f'{project_id}_') and file.endswith('.json')]

    if not keypoint_file:
        raise HTTPException(status_code=404, detail="Keypoint not found")
    
    if len(keypoint_file) > 1:
        raise HTTPException(status_code=500, detail="Multiple keypoints found")
    else:
        with open(os.path.join(KEYPOINT, keypoint_file[0]), 'r') as f:
            return {"keypoint": json.load(f)}


@app.get('/api/get_result/{project_id}', status_code=200)
async def get_result(project_id: int):
    result_file = [file for file in os.listdir(RESULT) if file.startswith(f'{project_id}_') and file.endswith('.json')]

    if not result_file:
        raise HTTPException(status_code=404, detail="Result not found")
    
    if len(result_file) > 1:
        result_file = sorted(result_file, key=lambda x: int(x.split('_')[-1].split('.')[0]))
        with open(os.path.join(RESULT, result_file[-1]), 'r') as f:
            data = json.load(f)
        return {"result": data}
    else:
        with open(os.path.join(RESULT, result_file[0]), 'r') as f:
            data = json.load(f)
        return {"result": data}


@app.get('/api/get_csv/{project_id}', status_code=200)
async def get_csv(project_id: int):
    result_file = [file for file in os.listdir(RESULT) if file.startswith(f'{project_id}_') and file.endswith('.json')]

    if not result_file:
        raise HTTPException(status_code=404, detail="Result not found")
    
    if len(result_file) > 1:
        result_file = sorted(result_file, key=lambda x: int(x.split('_')[-1].split('.')[0]))
        result_name = result_file[-1].split('.')[0]
        with open(os.path.join(RESULT, result_file[-1]), 'r') as f:
            json_data = json.load(f)
    else:
        result_name = result_file[0].split('.')[0]
        with open(os.path.join(RESULT, result_file[0]), 'r') as f:
            json_data = json.load(f)

    csv_data = io.StringIO()
    csv_writer = csv.writer(csv_data)
    csv_writer.writerow(['Modapts', 'In', 'Out', 'Duration'])  
    for entry in json_data:
        csv_writer.writerow([entry['Modapts'], entry['In'], entry['Out'], entry['Duration']])

    csv_data.seek(0)

    return StreamingResponse(iter([csv_data.getvalue()]),
                             media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename={result_name}.csv"})


@app.delete('/api/delete_project/{project_id}', status_code=200)
async def delete_project(project_id: int):
    def delete_project_files(directory):
        if not os.path.exists(directory):
            return
        for file in os.listdir(directory):
            if file.startswith(f'{project_id}_'):
                os.remove(os.path.join(directory, file))
    try:
        delete_project_files(VIDEO)
        delete_project_files(META_DATA)
        delete_project_files(KEYPOINT)
        delete_project_files(os.path.join(FEATURE_VECTOR, 'X_csv'))
        delete_project_files(os.path.join(FEATURE_VECTOR, 'X_pkl'))
        delete_project_files(RESULT)
        delete_project_files(VOTING_TABLE)
        delete_project_files(CONFIDENCE_TABLE)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during deletion: {e}")

    return {"detail": "Project deleted successfully"}



@app.options('/api/update_result/{project_id}', status_code=200)
async def update_result(project_id: int, result: Any = Body(...)):
    version = issue_version(project_id)
    file_name = get_filename(project_id)

    result_file_path = f"{RESULT}/{project_id}_{file_name}_{version}.json"

    with open(result_file_path, 'w') as f:
        json.dump(result, f)

    return {"id": project_id, "version": version}
    
        
@app.post('/api/upload_project', status_code=201)
async def upload_project(gbm: str = Form(...), product: str = Form(...), plant: str = Form(...), route: str = Form(...), userid: str = Form(...), insertDate: str = Form(...), updateDate: str = Form(...), description: str = Form(...), file: UploadFile = File(...)):
    id = issue_id()

    metadata = {  
        'id': id,
        'gbm': gbm,  
        'product': product,  
        'plant': plant,  
        'route': route,  
        'userid': userid,
        'insertDate': insertDate,
        'updateDate': updateDate,
        'description': description,
        'done': False
    }

    video_filename = os.path.splitext(file.filename)[0]

    video_file_path = f"{VIDEO}/{id}_{file.filename}"
    with open(video_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    metadata_file_path = f"{META_DATA}/{id}_{video_filename}.json"
    with open(metadata_file_path, 'w') as f:
        json.dump(metadata, f)

    executor.submit(process_video, metadata_file_path, video_file_path)

    return {"id": id}


######


@app.post('/test/upload_video/')
async def upload_file(file: UploadFile = File(...)):
    with zipfile.ZipFile('return.zip', 'w') as zf:
        zf.write('./test_file/test.json')
        zf.write('./test_file/test.csv')
    os.remove('return.zip')
    return FileResponse('return.zip', media_type='application/zip')

@app.get('/test/download_video')
async def test_download_video():
    return FileResponse('test_file/0707_MX_0002_TEST.mp4', media_type='video/mp4')

@app.get('/test/download_csv')
async def test_download_csv():
    return FileResponse('test_file/X_fv_0701_MX_0001.csv', media_type='text/csv')

@app.get('/test/get_json')
async def test_get_json():
    # return FileResponse('test_file/0707_MX_0002_TEST.json', media_type='application/json')
    # jsonify
    with open('test_file/0707_MX_0002_TEST.json') as f:
        data = json.load(f)
    return data

# if __name__ == '__main__':
#     import uvicorn
#     uvicorn.run(app, host='0.0.0.0', port=9998)
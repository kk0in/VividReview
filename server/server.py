from fastapi import FastAPI, UploadFile, Form, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from typing import Any

import zipfile
import shutil
import json
import os
import numpy as np 

app = FastAPI()

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
os.makedirs(VOTING_TABLE, exist_ok=True)
os.makedirs(CONFIDENCE_TABLE, exist_ok=True)

confidence_threshold = 0.5
labels = ['M3', 'G1', 'M1', 'M2', 'P2', 'R2', 'A2', 'BG']

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


def get_votes(label_array, confidence_array):
    dic = {}

    for i in range(label_array.shape[0]):
        frame_labels = label_array[i]
        frame_confidences = np.max(confidence_array[i], axis=1)
        d = {}
        votes = [(int(label), float(confidence)) for label, confidence in zip(frame_labels, frame_confidences) if confidence >= confidence_threshold and label != -1]

        # If there are no votes above the threshold, choose the label with the highest confidence
        if not votes:
            max_confidence_index = np.argmax(frame_confidences)
            final_label = frame_labels[max_confidence_index]
        else:
            # Choose the most frequent vote
            vote_counts = np.bincount([label for label, _ in votes])
            max_vote_count = np.max(vote_counts)
            
            # Check if there are ties in vote counts
            tied_labels = np.where(vote_counts == max_vote_count)[0]
            if len(tied_labels) == 1:
                final_label = tied_labels[0]
            else:
                # Choose the tied label with higher total confidence
                total_confidences = [sum(confidence for label_vote, confidence in votes if label_vote == label) for label in tied_labels]
                max_total_confidence_index = np.argmax(total_confidences)
                final_label = tied_labels[max_total_confidence_index]
        d["votes"] = votes
        d["final_label"] = int(final_label)

        dic[i+1] = d

    return dic


def convert_frame(datetime):
    minute = int(datetime.split(':')[0])
    second = int(datetime.split(':')[1].split('.')[0])
    frame = int(datetime.split(':')[1].split('.')[1])

    total_frame = frame + 60 * second + 3600 * minute

    return total_frame

def get_topk(project_id, dic):
    voting_table_list = [file for file in os.listdir(VOTING_TABLE) if file.startswith(f'{project_id}_') and file.endswith('.txt')]
    confidence_tabel_list = [file for file in os.listdir(CONFIDENCE_TABLE) if file.startswith(f'{project_id}_') and file.endswith('.txt')]
    topk = []
    
    if len(voting_table_list) > 1:
        raise HTTPException(status_code=500, detail="Multiple voting tables found")
    elif len(confidence_tabel_list) > 1:
        raise HTTPException(status_code=500, detail="Multiple confidence tables found")
    else:
        votes = []
        rank = {}
        start_frame = convert_frame(dic["start"]) + 1
        end_frame = convert_frame(dic["end"])

        votes_info = get_votes(np.loadtxt(os.path.join(VOTING_TABLE, voting_table_list[0]), delimiter=' ').reshape(-1, 8), np.loadtxt(os.path.join(CONFIDENCE_TABLE, confidence_tabel_list[0]), delimiter=' ').reshape(-1, 8, 8))
        # print(votes_info)
        for k, v in votes_info.items():
            k_int = int(k)
            if start_frame <= k_int <= end_frame:
                if v["votes"]:
                    votes.extend(v["votes"])
                else:
                    votes.append([v["final_label"], confidence_threshold])
            elif k_int > end_frame:
                break
        for i in votes:
            if i[0] in rank.keys():
                rank[i[0]] += 1
            else:
                rank[i[0]] = 1

        # print(rank)

        total = sum(rank.values())
        
        for k in rank.keys():
            rank[k] /= total

        rank = dict(sorted(rank.items(), key=lambda x: x[1], reverse=True)[:4])
        for k, v in rank.items():
            topk.append({'label' : labels[int(k)], 'score' : v})
    
    # print(topk)

    return topk



@app.get('/api/get_project', status_code=200)
async def get_project():
    metadata_list = [file for file in os.listdir(META_DATA) if file.endswith('.json')]
    project_list = []

    for metadata in metadata_list:
        with open(os.path.join(META_DATA, metadata), 'r') as f:
            project_list.append(json.load(f))

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
        for dic in data:
            dic['topk'] = get_topk(project_id, dic)        
        with open(os.path.join(RESULT, result_file[-1]), 'w') as f:
            json.dump(data, f)
        return {"result": data}
    else:
        with open(os.path.join(RESULT, result_file[0]), 'r') as f:
            data = json.load(f)
        for dic in data:
            idx = data.index(dic)
            dic['topk'] = get_topk(project_id, dic)
            print(idx+1) 
            print(data[idx])
        with open(os.path.join(RESULT, result_file[0]), 'w') as f:
            json.dump(data, f)
        return {"result": data}
        
@app.options('/api/update_result/{project_id}', status_code=200)
async def update_result(project_id: int, result: Any = Body(...)):
    version = issue_version(project_id)
    file_name = get_filename(project_id)

    result_file_path = f"{RESULT}/{project_id}_{file_name}_{version}.json"

    with open(result_file_path, 'w') as f:
        json.dump(result, f)

    return {"id": project_id, "version": version}
    
        
@app.post('/api/upload_project', status_code=201)
async def upload_project(gbm: str = Form(...), product: str = Form(...), plant: str = Form(...), route: str = Form(...), description: str = Form(...), file: UploadFile = File(...)):
    id = issue_id()

    metadata = {  
        'id': id,
        'gbm': gbm,  
        'product': product,  
        'plant': plant,  
        'route': route,  
        'description': description,
        'done': 0
    }

    video_filename = os.path.splitext(file.filename)[0]

    video_file_path = f"{VIDEO}/{id}_{file.filename}"
    with open(video_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    metadata_file_path = f"{META_DATA}/{id}_{video_filename}.json"
    with open(metadata_file_path, 'w') as f:
        json.dump(metadata, f)

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

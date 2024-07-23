from fastapi import FastAPI, UploadFile, Form, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from concurrent.futures import ThreadPoolExecutor

# from model.test import run_inference

from typing import Any, List, Dict
from fastapi.responses import StreamingResponse

import zipfile
import shutil
import json
import os
import numpy as np 
import csv
import io
import fitz
import logging

app = FastAPI()
logging.basicConfig(filename='info.log', level=logging.DEBUG)

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

PDF = './pdfs'
TEMP = './temp'
RESULT = './results'
META_DATA = './metadata'
ANNOTATIONS = './annotations'


os.makedirs(PDF, exist_ok=True)
os.makedirs(TEMP, exist_ok=True)
os.makedirs(META_DATA, exist_ok=True)
os.makedirs(RESULT, exist_ok=True)
os.makedirs(ANNOTATIONS, exist_ok=True)

confidence_threshold = 0.5
labels = ['M3', 'G1', 'M1', 'M2', 'P2', 'R2', 'A2', 'BG']

def process_video(metadata_file_path, video_file_path):
    """
    주어진 비디오 파일을 처리하는 함수입니다.
    비디오 파일에 대한 inference를 수행하고, metadata 파일을 업데이트하여 처리 완료를 표시합니다.
    
    :param metadata_file_path: metadata 파일의 경로입니다.
    :param video_file_path: 처리할 비디오 파일의 경로입니다.
    """

    run_inference(video_file_path)

    with open(metadata_file_path, 'r') as f:
        data = json.load(f)

    data['done'] = True

    with open(metadata_file_path, 'w') as file:
        json.dump(data, file)

    print("done")

def issue_id():
    """
    새 프로젝트에 대한 고유 ID를 발급하는 함수입니다.
    metadata 디렉토리에 있는 모든 JSON 파일을 확인하여 가장 큰 ID를 찾고, 그 다음 숫자를 반환합니다.
    """

    metadata_list = [file for file in os.listdir(META_DATA) if file.endswith('.json')]
    if metadata_list:
        ids = [int(file.split('_')[0]) for file in metadata_list]
        return max(ids) + 1
    else:
        return 1
    
def issue_version(project_id):
    """
    특정 프로젝트 ID에 대한 버전을 발급하는 함수입니다.
    결과 디렉토리에서 프로젝트 ID와 일치하는 파일들을 찾아 가장 높은 버전 번호를 반환합니다.
    
    :param project_id: 프로젝트의 고유 ID입니다.
    """

    result_list = [file for file in os.listdir(RESULT) if file.startswith(f'{project_id}_') and file.endswith('.json')]
    if result_list:
        versions = [int(file.split('_')[-1].split('.')[0]) for file in result_list]
        return max(versions) + 1
    else:
        return 1

def get_filename(id):
    """
    특정 ID에 해당하는 파일 이름을 반환하는 함수입니다.
    metadata 디렉토리에서 ID와 일치하는 파일을 찾아 파일 이름을 반환합니다.
    
    :param id: 찾고자 하는 파일의 ID입니다.
    """

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
    
# 아래부터는 FastAPI 경로 작업입니다. 각각의 함수는 API 엔드포인트로, 특정 작업을 수행합니다.
# @app.post("/api/save_annotations/{project_id}")
# async def save_annotations(project_id: int, annotations: List[Dict]):
#     annotations_path = os.path.join(ANNOTATIONS, f"{project_id}.json")
#     with open(annotations_path, 'w') as f:
#         json.dump(annotations, f)
#     return {"detail": "Annotations saved successfully"}

# @app.get("/api/load_annotations/{project_id}")
# async def load_annotations(project_id: int):
#     annotations_path = os.path.join(ANNOTATIONS, f"{project_id}.json")
#     if not os.path.exists(annotations_path):
#         return []
#     with open(annotations_path, 'r') as f:
#         annotations = json.load(f)
#     return annotations
# @app.options("/api/update_pdf/{project_id}", status_code=200)
# async def update_pdf(project_id: int, annotations: Any = Body(...)):
#     """
#     특정 프로젝트 ID의 PDF 파일을 업데이트하는 API 엔드포인트입니다.
#     기존 PDF 파일을 열고 주어진 주석을 추가하여 덮어씁니다.

#     :param project_id: 업데이트할 프로젝트의 ID입니다.
#     :param annotations: 업데이트할 주석 데이터입니다.
#     """
#     pdf_file = [file for file in os.listdir(PDF) if file.startswith(f'{project_id}_') and file.endswith('.pdf')]

#     if not pdf_file:
#         raise HTTPException(status_code=404, detail="PDF file not found")
    
#     if len(pdf_file) > 1:
#         raise HTTPException(status_code=500, detail="Multiple PDF files found")
    
#     pdf_path = os.path.join(PDF, pdf_file[0])

#     try:
#         # Load the annotations
#         annotations = json.loads(annotations)

#         # Open the existing PDF
#         pdf_document = fitz.open(pdf_path)

#         for annotation in annotations:
#             page_number = annotation['pageNumber']
#             x = annotation['x']
#             y = annotation['y']
#             text = annotation['text']
            
#             page = pdf_document.load_page(page_number - 1)
#             page.insert_text((x, y), text, fontsize=12, color=(0, 0, 0))

#         # Save the annotated PDF by overwriting the original PDF
#         pdf_document.save(pdf_path)

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error during annotation: {e}")

#     return {"id": project_id, "detail": "PDF updated successfully"}

@app.post('/api/save_annotated_pdf/{project_id}', status_code=200)
async def save_annotated_pdf(project_id: int, annotated_pdf: UploadFile = File(...)):
    pdf_file = [file for file in os.listdir(PDF) if file.startswith(f'{project_id}_') and file.endswith('.pdf')]

    if not pdf_file:
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    if len(pdf_file) > 1:
        raise HTTPException(status_code=500, detail="Multiple PDF files found")

    original_pdf_path = os.path.join(PDF, pdf_file[0])

    # Save the uploaded annotated PDF temporarily
    annotated_pdf_path = f"{TEMP}/{project_id}_annotated_temp.pdf"
    with open(annotated_pdf_path, "wb") as buffer:
        shutil.copyfileobj(annotated_pdf.file, buffer)

    # Open the original PDF and the annotated PDF
    original_pdf = fitz.open(original_pdf_path)
    annotated_pdf = fitz.open(annotated_pdf_path)

    logging.info(len(original_pdf))
    logging.info(len(annotated_pdf))
    
    if len(original_pdf) != len(annotated_pdf):
        raise HTTPException(status_code=400, detail="Page count mismatch")

    # Add annotations from the annotated PDF to the original PDF
    for page_num in range(len(original_pdf)):
        original_page = original_pdf.load_page(page_num)
        annotated_page = annotated_pdf.load_page(page_num)

        # Insert the annotated page image into the original PDF
        original_page.show_pdf_page(original_page.rect, annotated_pdf, page_num)

    # Save the modified original PDF
    original_pdf.saveIncr()

    # Clean up the temporary annotated PDF file
    os.remove(annotated_pdf_path)

    return {"message": "Annotated PDF saved successfully"}

@app.get('/api/get_project', status_code=200)
async def get_project():
    """
    모든 프로젝트 목록을 반환하는 API 엔드포인트입니다.
    metadata 파일들을 읽어 프로젝트 정보를 리스트 형태로 반환합니다.
    """

    metadata_list = [file for file in os.listdir(META_DATA) if file.endswith('.json')]
    project_list = []

    for metadata in metadata_list:
        with open(os.path.join(META_DATA, metadata), 'r') as f:
            project_list.append(json.load(f))

    project_list.sort(key=lambda x: x['id'])

    return {"projects": project_list}

@app.get('/api/get_project/{project_id}', status_code=200)
async def get_project(project_id: int):
    """
    특정 프로젝트 ID에 해당하는 프로젝트 정보를 반환하는 API 엔드포인트입니다.
    프로젝트 ID와 일치하는 metadata 파일을 찾아 해당 정보를 반환합니다.
    
    :param project_id: 조회하고자 하는 프로젝트의 ID입니다.
    """

    metadata_file = [file for file in os.listdir(META_DATA) if file.startswith(f'{project_id}_') and file.endswith('.json')]

    if not metadata_file:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if len(metadata_file) > 1:
        raise HTTPException(status_code=500, detail="Multiple projects found")
    else:
        with open(os.path.join(META_DATA, metadata_file[0]), 'r') as f:
            return {"project": json.load(f)}
        
@app.get('/api/get_pdf/{project_id}', status_code=200)
async def get_pdf(project_id: int):
    """
    특정 프로젝트 ID에 해당하는 pdf 파일을 반환하는 API 엔드포인트입니다.
    프로젝트 ID와 일치하는 pdf 파일을 찾아 FileResponse 객체로 반환합니다.
    
    :param project_id: 조회하고자 하는 프로젝트의 ID입니다.
    """
    
    pdf_file = [file for file in os.listdir(PDF) if file.startswith(f'{project_id}_') and file.endswith('.pdf')]

    if not pdf_file:
        raise HTTPException(status_code=404, detail="Pdf file not found")
    
    if len(pdf_file) > 1:
        raise HTTPException(status_code=500, detail="Multiple pdf files found")
    else:
        return FileResponse(os.path.join(PDF, pdf_file[0]), media_type='application/pdf')
    
@app.get('/api/get_result/{project_id}', status_code=200)
async def get_result(project_id: int):
    """
    특정 프로젝트 ID에 해당하는 결과 데이터를 반환하는 API 엔드포인트입니다.
    프로젝트 ID와 일치하는 결과 파일을 찾아 해당 데이터를 반환합니다.
    
    :param project_id: 조회하고자 하는 프로젝트의 ID입니다.
    """
    
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

@app.delete('/api/delete_project/{project_id}', status_code=200)
async def delete_project(project_id: int):
    """
    특정 프로젝트 ID에 해당하는 모든 관련 파일을 삭제하는 API 엔드포인트입니다.
    프로젝트와 관련된 모든 디렉토리에서 ID와 일치하는 파일들을 찾아 삭제합니다.
    
    :param project_id: 삭제할 프로젝트의 ID입니다.
    """

    def delete_project_files(directory):
        if not os.path.exists(directory):
            return
        for file in os.listdir(directory):
            if file.startswith(f'{project_id}_'):
                os.remove(os.path.join(directory, file))
    try:
        delete_project_files(PDF)
        delete_project_files(META_DATA)
        delete_project_files(RESULT)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during deletion: {e}")

    return {"detail": "Project deleted successfully"}

@app.options('/api/update_result/{project_id}', status_code=200)
async def update_result(project_id: int, result: Any = Body(...)):
    """
    특정 프로젝트 ID의 결과를 업데이트하는 API 엔드포인트입니다.
    새로운 버전의 결과 파일을 생성하고, 해당 내용을 파일에 저장합니다.
    
    :param project_id: 업데이트할 프로젝트의 ID입니다.
    :param result: 업데이트할 결과 데이터입니다.
    """

    version = issue_version(project_id)
    file_name = get_filename(project_id)

    result_file_path = f"{RESULT}/{project_id}_{file_name}_{version}.json"

    with open(result_file_path, 'w') as f:
        json.dump(result, f)

    return {"id": project_id, "version": version}
    
        
@app.post('/api/upload_project', status_code=201)
async def upload_project(userID: str = Form(...), insertDate: str = Form(...), updateDate: str = Form(...), userName: str = Form(...), file: UploadFile = File(...)):
    """
    새 프로젝트를 업로드하는 API 엔드포인트입니다.
    프로젝트 metadata를 생성하고, PDF 파일을 서버에 저장합니다.     
    :param userID, insertDate, updateDate, userName: 프로젝트 metadata 입니다.
    :param file: 업로드할 PDF 파일입니다.
    """

    id = issue_id()

    metadata = {  
        'id': id,
        'userID': userID,
        'insertDate': insertDate,
        'updateDate': updateDate,
        'userName': userName,
        'done': True
    }

    pdf_filename = os.path.splitext(file.filename)[0]

    pdf_file_path = f"{PDF}/{id}_{file.filename}"
    with open(pdf_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    metadata_file_path = f"{META_DATA}/{id}_{pdf_filename}.json"
    with open(metadata_file_path, 'w') as f:
        json.dump(metadata, f)

    executor.submit(metadata_file_path, pdf_file_path)

    return {"id": id}


###### 아래는 테스트용 코드이니 무시하셔도 됩니다. ######
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
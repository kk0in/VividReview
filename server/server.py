from fastapi import FastAPI, UploadFile, Form, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from concurrent.futures import ThreadPoolExecutor
from google.cloud import speech

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
import ffmpeg
import logging
from google.cloud import speech_v1p1beta1 as speech
import base64
from pdf2image import convert_from_path
import requests
import re
from openai import OpenAI

app = FastAPI()
logging.basicConfig(filename='info.log', level=logging.DEBUG)
api_key = "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"

executor = ThreadPoolExecutor(10)
client = OpenAI(api_key=api_key)

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
RECORDING = './recordings'
SCRIPT = './scripts'
TOC = './tocs'
IMAGE = './images'
SPM = './spms'  
BBOX = './bboxs'

os.makedirs(PDF, exist_ok=True)
os.makedirs(TEMP, exist_ok=True)
os.makedirs(META_DATA, exist_ok=True)
os.makedirs(RESULT, exist_ok=True)
os.makedirs(ANNOTATIONS, exist_ok=True)
os.makedirs(RECORDING, exist_ok=True)
os.makedirs(SCRIPT, exist_ok=True)
os.makedirs(TOC, exist_ok=True)
os.makedirs(IMAGE, exist_ok=True)
os.makedirs(SPM, exist_ok=True)
os.makedirs(BBOX, exist_ok=True)

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "watchful-lotus-383310-7782daea2dc1.json"

confidence_threshold = 0.5

def read_script(script_path):
    with open(script_path, "r") as script_file:
        # return script_file.read()
        script_content = script_file.read()
        return json.loads(script_content)

def convert_webm_to_mp3(webm_path, mp3_path):
    try:
        ffmpeg.input(webm_path).output(mp3_path).run()
    except ffmpeg.Error as e:
        print(f"ffmpeg error: {e.stderr}")
        raise Exception(f"Error message: {e}")

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def run_stt(mp3_path, transcription_path, timestamp_path):
    audio_file = open(mp3_path, "rb")
    
    transcript1 = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
    )

    transcript2 = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="verbose_json",
        timestamp_granularities=["word"]
    )

    with open(transcription_path, "w") as output_file:
        json.dump(transcript1.text, output_file, indent=4)
    
    with open(timestamp_path, "w") as output_file:
        json.dump(transcript2.words, output_file, indent=4)

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

def bbox_api_request(script_segment, encoded_image):    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    content = [
        {
            "type": "text",
            "text": (
                # "Given the following lecture notes image and the corresponding lecture script, "
                # "please provide bounding box information for each relevant script sentence. "
                "Tell me specifically where each sentence in the script describes in the image. "
                "If there is a corresponding part on the image, please tell me the bounding box information of that area. "
                "The output should be in JSON format with the structure: "
                "{\"bboxes\": [{\"script\": \"string\", \"bbox\": [x, y, w, h]}]} "
                "Ensure that the value for script in the JSON response should be a sentence from the provided script, and the value must never be text extracted from the image. "
                f"script: {script_segment} "
                # "The bounding box is given in the form [x,y,w,h]. x and y represent the center position of the bounding box, "
                # "while w and h represent the width and height of the bounding box, respectively. "
                # "The coordinates are based on the top-left corner of the image being (0,0), with the x direction being vertical and the y direction being horizontal. "
                # "If a sentence in the script is highly relevant to a specific part of the image, "
                # "use the sentence as the key and provide the bounding box information of the specific part of the image as the value. "
                # "Only find bounding boxes for the sentences that are highly relevant to specific parts of the image. "
                # "The original format of the script, including uppercase and lowercase letters, punctuation marks such as periods and commas, must be preserved without any alterations."
            )
        },
        # {"type": "text", "text": script_segment},
        {"type": "image_url", "image_url": {"url": encoded_image}}
    ]

    payload = {
        "model": "gpt-4o",
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system", 
                "content": "You are a helpful assistant designed to output JSON."
            },
            {
                "role": "user",
                "content": content
            }
        ],
        "max_tokens": 2000,
    }

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
    return response.json()


async def create_bbox(bbox_dir, matched_paragraphs, encoded_images):
    for i, encoded_image in enumerate(encoded_images):
        page_number = str(i + 1)
        script_segment = matched_paragraphs[page_number]
        response_data = bbox_api_request(page_number, script_segment, encoded_image)
        
        # Process the response data
        if 'choices' in response_data and len(response_data['choices']) > 0:
            script_text = response_data['choices'][0]['message']['content']
            # Convert the script text to JSON format
            try:
                script_data = json.loads(script_text)
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON for page {page_number}: {e}")
                script_data = {"error": "Failed to decode JSON"}
        else:
            print(f"Error: 'choices' key not found in the response for page {page_number}")
            script_data = {"error": "Failed to retrieve scripts"}

        # Save the script data as a JSON file
        bbox_path = os.path.join(bbox_dir, f"{page_number}_spm.json")
        with open(bbox_path, "w") as json_file:
            json.dump(script_data, json_file, indent=4)


async def create_spm(script_content, encoded_images):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    content = [
        {
            "type": "text",
            "text": (
                "Given the following lecture notes images and the corresponding lecture script, "
                "please distribute the script content accurately to each page of the lecture notes. "
                "The output should be in the format: {\"1\": \"script\", \"2\": \"script\", ...}. "
                "Each key should correspond to the page number in the lecture notes where the script content appears, "
                "and the value should be the first sentence of the script content for that page. "
                "The value corresponding to a larger key must be a sentence that appears later in the script. "
                f"The number of dictionary keys must be equal to {len(encoded_images)}. "
                "The original format of the script, including uppercase and lowercase letters, punctuation marks such as periods and commas, must be preserved without any alterations."
            )
        },
        {"type": "text", "text": script_content}
    ] + encoded_images

    payload = {
        "model": "gpt-4o",
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system", 
                "content": "You are a helpful assistant designed to output JSON."
            },
            {
                "role": "user",
                "content": content
            }
        ],
        "max_tokens": 2000,
    }

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
    response_data = response.json()

    if 'choices' in response_data and len(response_data['choices']) > 0:
        script_text = response_data['choices'][0]['message']['content']
        try:
            script_data = json.loads(script_text)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            script_data = {"error": "Failed to decode JSON"}
    else:
        print("Error: 'choices' key not found in the response")
        print(response_data)
        script_data = {"error": "Failed to retrieve scripts"}

    return script_data

def match_paragraphs_1(script_content, first_sentences):
    matched_paragraphs = {}
    page_numbers = sorted(first_sentences.keys(), key=int)
    script_content_lower = script_content.lower()

    for i, page in enumerate(page_numbers):
        current_sentence = first_sentences[page].lower()
        next_sentence = first_sentences[str(int(page) + 1)].lower() if i < len(page_numbers) - 1 else None

        try:
            start_index = script_content_lower.find(current_sentence)
            if i == len(page_numbers) - 1:  # Last page
                matched_paragraphs[page] = script_content[start_index:].strip()
            else:
                end_index = script_content_lower.find(next_sentence)
                matched_paragraphs[page] = script_content[start_index:end_index].strip()
        except Exception as e:
            print(f"Error occurred at page {page}: {str(e)}")

    return matched_paragraphs

def match_paragraphs_2(script_content, first_sentences):
    matched_paragraphs = {}
    page_numbers = sorted(first_sentences.keys(), key=int)

    for i, page in enumerate(page_numbers):
        current_sentence = first_sentences[page]
        next_page_number = str(int(page) + 1)
        
        if i == 0:
            try:
                matched_paragraphs[page] = script_content.split(first_sentences[next_page_number].lower())[0].strip()
            except:
                print(f"Error occurred at page {page}")
        elif i == len(page_numbers) - 1:
            try:
                matched_paragraphs[page] = first_sentences[page].lower() + ' ' + script_content.split(first_sentences[page].lower())[1].strip()
            except:
                print(f"Error occurred at page {page}")
        else:
            try:
                matched_paragraphs[page] = first_sentences[page].lower() + ' ' + script_content.split(first_sentences[page].lower())[1].split(first_sentences[next_page_number].lower())[0].strip()
            except:
                print(f"Error occurred at page {page}")
    return matched_paragraphs

def timestamp_for_matched_paragraphs(matched_paragraphs, word_timestamp):
    output = {}
    offset = 0
    for para_id, paragraph_text in matched_paragraphs.items():
        words = paragraph_text.split()
        start_time = word_timestamp[offset]["start"]
        end_time = word_timestamp[offset + len(words) - 1]["end"]
        
        output[para_id] = {
            "start": start_time,
            "end": end_time,
            "text": paragraph_text
        }
        offset += len(words) 

    return output

def timestamp_for_bbox(project_id, word_timestamp):
    for page_num in range(1, len(os.listdir(os.path.join(BBOX, str(project_id))))+1):
        bbox_path = os.path.join(BBOX, str(project_id), f"{page_num}_spm.json")

        # Load the bbox data for the current page
        with open(bbox_path, 'r') as file:
            bboxes = json.load(file)

        updated_bboxes = []
        for item in bboxes["bboxes"]:
            bbox = item["bbox"]
            if not bbox or bbox[2]==0 or bbox[3]==0:
                continue
        
            start_time, end_time = get_script_times(item["script"], word_timestamp)
            if start_time is not None:
                item["start"] = start_time
                item["end"] = end_time
                updated_bboxes.append(item)

        # Save the updated data back to the JSON file
        bboxes["bboxes"] = updated_bboxes
        with open(bbox_path, 'w') as file:
            json.dump(bboxes, file, indent=4)

def get_script_times(script_text, word_timestamp):
    # Remove punctuation from the script_text and split into words
    words = re.findall(r'\b[\w\']+\b', script_text.lower())
    
    start_time = None
    end_time = None

    if len(words) >= 3:
        for i in range(len(word_timestamp) - 2):
            if (word_timestamp[i]['word'].lower() == words[0] and word_timestamp[i + 1]['word'].lower() == words[1] and word_timestamp[i + 2]['word'].lower() == words[2]):
                
                # Set start time from the first word
                start_time = word_timestamp[i]['start']
                
                # Find end time from the last word in words
                for j in range(i + 2, len(word_timestamp)):
                    if word_timestamp[j]['word'].lower() == words[-1]:
                        end_time = word_timestamp[j]['end']
                        break
                break

    return start_time, end_time


# 아래부터는 FastAPI 경로 작업입니다. 각각의 함수는 API 엔드포인트로, 특정 작업을 수행합니다.
@app.post('/api/activate_review/{project_id}', status_code=201)
async def activate_review(project_id: int):
    """
    GPT API를 이용하여 JSON 파일을 생성하고, 이를 후처리하여 최종 JSON 파일을 생성하는 API 엔드포인트입니다.

    :param project_id: 프로젝트 ID
    """
    
    metadata_file_path = os.path.join(META_DATA, f"{project_id}_metadata.json")
    image_directory = os.path.join(IMAGE, f"{str(project_id)}")
    script_path = os.path.join(SCRIPT, f"{project_id}_transcription.json")
    matched_paragraphs_json_path = os.path.join(SPM, f"{project_id}_matched_paragraphs.json")
    bbox_dir = os.path.join(BBOX, str(project_id))
    os.makedirs(bbox_dir, exist_ok=True)

    with open(os.path.join(SCRIPT, f"{project_id}_timestamp.json"), 'r') as file:
        word_timestamp = json.load(file)
    
    image_paths = sorted([os.path.join(image_directory, f) for f in os.listdir(image_directory) if f.lower().endswith('.png')])
    encoded_images = [{"type": "image_url", "image_url": {"url": f"data:image/png;base64,{encode_image(image)}"}} for image in image_paths]

    script_content = read_script(script_path)

    # Phase 1: temporally match the script content to the images
    try:
        first_sentences = await create_spm(script_content, encoded_images)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during creating spm: {e}")

    # 결과 저장
    first_sentences_path = os.path.join(SPM, f"{project_id}_spm.json")
    with open(first_sentences_path, "w") as json_file:
        json.dump(first_sentences, json_file, indent=4)

    # 단락 매칭
    matched_paragraphs = match_paragraphs_2(script_content, first_sentences)

    # Phase 2: spatially match the script content to the images
    try:
        await create_bbox(bbox_dir, matched_paragraphs, encoded_images)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during creating bbox: {e}")

    # Time Stamping for matched paragraphs (temporal)
    output = timestamp_for_matched_paragraphs(matched_paragraphs, word_timestamp)
    with open(matched_paragraphs_json_path, "w") as json_file:
        json.dump(output, json_file, indent=4)

    # Time Stamping for bbox (spatial)
    timestamp_for_bbox(project_id, word_timestamp)

    # Update metadata file to enable review mode
    with open(metadata_file_path, 'r') as f:
        data = json.load(f)
    data['reviewMode'] = True
    with open(metadata_file_path, 'w') as file:
        json.dump(data, file)

    return JSONResponse(content={"id": id, "redirect_url": f"/viewer/{id}"})

@app.get('/api/get_matched_paragraphs/{project_id}', status_code=200)
async def get_matched_paragraphs(project_id: int):
    """
    생성된 matched paragraphs 파일을 가져오는 API 엔드포인트입니다.

    :param project_id: 프로젝트 ID
    """
    matched_file_path = os.path.join(SPM, f"{project_id}_matched_paragraphs.json")

    if not os.path.exists(matched_file_path):
        raise HTTPException(status_code=404, detail="Generated JSON files not found")

    try:
        with open(matched_file_path, "r") as matched_file:
            matched_data = json.load(matched_file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading matched paragraphs file: {e}")

    return matched_data

@app.get('/api/get_bbox/{project_id}', status_code=200)
async def get_bbox(project_id: int, page_num: int):
    """
    생성된 bbox 파일을 가져오는 API 엔드포인트입니다.

    :param project_id: 프로젝트 ID
    """
    bbox_path = os.path.join(BBOX, str(project_id), f"{page_num}_matched_paragraphs.json")

    if not os.path.exists(bbox_path):
        raise HTTPException(status_code=404, detail="Generated JSON files not found")

    try:
        with open(bbox_path, "r") as bbox_file:
            bbox_data = json.load(bbox_file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading bbox file: {e}")

    return bbox_data
    
@app.post('/api/save_recording/{project_id}', status_code=200)
async def save_recording(project_id: int, recording: UploadFile = File(...)):
    webm_path = os.path.join(RECORDING, f"{project_id}_recording.webm")
    mp3_path = os.path.join(RECORDING, f"{project_id}_recording.mp3")
    transcription_path = os.path.join(SCRIPT, f"{project_id}_transcription.json")
    timestamp_path = os.path.join(SCRIPT, f"{project_id}_timestamp.json")
    
    with open(webm_path, "wb") as buffer:
        shutil.copyfileobj(recording.file, buffer)

    # webm 파일을 mp3로 변환
    try:
        convert_webm_to_mp3(webm_path, mp3_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro during converting webm to mp3: {e}")
    
    # STT 모델 실행
    try:
        executor.submit(run_stt, mp3_path, transcription_path, timestamp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during STT: {e}")
    
    return {"message": "Recording saved and STT processing started successfully"}

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

@app.get('/api/get_toc/{project_id}', status_code=200)
async def get_toc(project_id: int):
    """
    특정 프로젝트 ID에 해당하는 목차 데이터를 반환하는 API 엔드포인트입니다.
    프로젝트 ID와 일치하는 목차 파일을 찾아 해당 데이터를 반환합니다.

    :param project_id: 조회하고자 하는 프로젝트의 ID입니다.
    """
    
    toc_file_path = os.path.join(TOC, f"{project_id}_toc.json")

    if not os.path.exists(toc_file_path):
        raise HTTPException(status_code=404, detail="TOC file not found")

    try:
        with open(toc_file_path, 'r') as f:
            toc_data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading TOC file: {str(e)}")

    return toc_data["table_of_contents"]

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
        'done': False,
        'reviewMode': False
    }

    pdf_filename = os.path.splitext(file.filename)[0]

    pdf_file_path = f"{PDF}/{id}_{file.filename}"
    with open(pdf_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    metadata_file_path = f"{META_DATA}/{id}_metadata.json"
    with open(metadata_file_path, 'w') as f:
        json.dump(metadata, f)

    image_dir = os.path.join(IMAGE, str(id))
    os.makedirs(image_dir, exist_ok=True)
    images = convert_from_path(pdf_file_path)

    for i, image in enumerate(images):
        image_path = os.path.join(IMAGE, str(id), f"page_{i + 1:04}.png")
        image.save(image_path, "PNG")

    # OpenAI GPT API를 호출하여 목차 생성
    try:
        toc_data = await create_toc(id, image_dir)
    except Exception as e:
        print(f"Error creating TOC: {e}")
        toc_data = {"error": "Failed to retrieve TOC"}

    # 생성된 목차를 JSON 파일로 저장
    toc_json_path = os.path.join(TOC, f"{id}_toc.json")
    with open(toc_json_path, 'w') as json_file:
        json.dump(toc_data, json_file, indent=4)
    
    metadata['done'] = True
    with open(metadata_file_path, 'w') as f:
        json.dump(metadata, f)

    executor.submit(metadata_file_path, pdf_file_path)

    return JSONResponse(content={"id": id, "redirect_url": f"/viewer/{id}"})

async def create_toc(project_id: int, image_dir: str):
    # Encode images to base64
    image_paths = sorted([os.path.join(image_dir, f) for f in os.listdir(image_dir) if f.lower().endswith('.png')])
    encoded_images = [{"type": "image_url", "image_url": {"url": f"data:image/png;base64,{encode_image(image)}"}} for image in image_paths]

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    # Creating the content for the messages
    content = [{"type": "text", "text": (
                "Extract a detailed table of contents with page numbers from the following images. "
                "Each section should have a unique title, and the subsections should be grouped under these main sections. "
                "The page numbers should start from 1 and each page number should be in an array. "
                "Ensure there are more than 4 main sections. "
                "The output should be in JSON format with the structure: "
                "{\"table_of_contents\": [{\"title\": \"string\", \"subsections\": [{\"title\": \"string\", \"page\": [\"number\"]}]}]} "
                "and include all pages starting from 1."
            )}] + encoded_images

    payload = {
        "model": "gpt-4o",
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system", 
                "content": "You are a helpful assistant designed to output JSON."
            },
            {
                "role": "user",
                "content": content
            }
        ],
        "max_tokens": 2000,
    }

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)

    # Get the response
    response_data = response.json()

    # Check if 'choices' key exists in the response
    if 'choices' in response_data and len(response_data['choices']) > 0:
        # Parse the table of contents from the response
        toc_text = response_data['choices'][0]['message']['content']
        
        # Convert the TOC text to JSON format
        try:
            toc_data = json.loads(toc_text)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            toc_data = {"error": "Failed to decode JSON"}
    else:
        print("Error: 'choices' key not found in the response")
        toc_data = {"error": "Failed to retrieve TOC"}
    
    return toc_data

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
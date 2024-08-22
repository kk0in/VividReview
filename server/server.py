import base64
import json
import logging
import math
import os
import shutil
import zipfile
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from typing import Any, List, Union

import clip
import cv2
import ffmpeg
import fitz
import numpy as np
import pandas as pd
import pymupdf
import requests
import torch
from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from google.cloud import vision
from hume import HumeBatchClient
from hume.models.config import ProsodyConfig
from openai import OpenAI
from pdf2image import convert_from_path
from PIL import Image
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util

app = FastAPI()
logging.basicConfig(filename="info.log", level=logging.DEBUG)
GPT_MODEL = "gpt-4o"
gpt_api_key = "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"
hume_api_key = "hCcXf3mVNMtVtNvAO9oz60drAywtf4qsHSVArsg2KFij5LvT"

executor = ThreadPoolExecutor(10)
client = OpenAI(api_key=gpt_api_key)

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

PDF = "./pdfs"
TEMP = "./temp"
RESULT = "./results"
META_DATA = "./metadata"
ANNOTATIONS = "./annotations"
RECORDING = "./recordings"
SCRIPT = "./scripts"
TOC = "./tocs"
IMAGE = "./images"
SPM = "./spms"
BBOX = "./bboxs"
LASSO = "./lasso"
KEYWORD = "./keywords"
CROP = "./crops"
SIMILARITY = "./similarity"
WINDOW_SIZE = 3

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
os.makedirs(LASSO, exist_ok=True)
os.makedirs(KEYWORD, exist_ok=True)
os.makedirs(CROP, exist_ok=True)
os.makedirs(SIMILARITY, exist_ok=True)

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "disco-beach-433010-q6-bf0ff037eb46.json"

confidence_threshold = 0.5
miss_threshold = 0.5


def detect_handwritten_text(image_path):
    # Google Cloud Vision 클라이언트 설정
    client = vision.ImageAnnotatorClient()

    # 이미지 파일을 읽고 Vision API에 전송
    with open(image_path, "rb") as image_file:
        content = image_file.read()

    image = vision.Image(content=content)
    image_context = vision.ImageContext(language_hints=["en-t-i0-handwrit"])

    # 손글씨 인식 수행
    response = client.document_text_detection(image=image, image_context=image_context)

    if response.error.message:
        raise Exception(f"{response.error.message}")

    if response.text_annotations:
        return response.text_annotations[0].description

    return ""


def remove_transparency(image_path):
    # PNG 이미지를 불러오기 (투명 배경 포함)
    image = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)

    # 알파 채널이 있는지 확인
    if image.shape[2] == 4:
        # 알파 채널 분리
        b, g, r, a = cv2.split(image)

        # 투명한 영역을 흰색 배경으로 채우기
        alpha_inv = cv2.bitwise_not(a)
        white_background = np.full_like(a, 255)
        b = cv2.bitwise_or(b, white_background, mask=alpha_inv)
        g = cv2.bitwise_or(g, white_background, mask=alpha_inv)
        r = cv2.bitwise_or(r, white_background, mask=alpha_inv)

        # 다시 합쳐서 BGR 이미지로 변환
        image = cv2.merge([b, g, r])

    # 저장된 이미지 반환
    cv2.imwrite(image_path, image)


def decode_base64_image(data):
    """Base64로 인코딩된 이미지를 디코딩하여 PIL Image 객체로 변환"""
    # 'data:image/png;base64,' 접두사가 있을 경우 제거
    if data.startswith("data:image"):
        data = data.split(",", 1)[1]

    try:
        image_data = base64.b64decode(data)
        image = Image.open(BytesIO(image_data))
        image.verify()  # 이미지가 유효한지 검증
        image = Image.open(BytesIO(image_data))  # 다시 열어야 실제 이미지로 사용 가능
        return image
    except base64.binascii.Error as e:
        raise ValueError(f"Base64 decoding failed: {e}")
    except (IOError, ValueError) as e:
        # 디버깅을 위해 Base64 문자열의 일부를 출력 (보안상 전체를 출력하지 않음)
        sample_data = data[:30] + "..." + data[-30:]
        raise ValueError(f"Failed to decode image: {e}. Base64 sample: {sample_data}")


def filter_script_data(script_data):
    allowed_keys = {"keyword", "formal"}
    return {key: value for key, value in script_data.items() if key in allowed_keys}


def sanitize_filename(input_string):
    return re.sub(r'[\\/*?:"<>|]', "", input_string).strip().replace(" ", "_")


def read_script(script_path):
    with open(script_path, "r") as script_file:
        # return script_file.read()
        script_content = script_file.read()
        return json.loads(script_content)


def convert_webm_to_mp3(webm_path, mp3_path):
    try:
        ffmpeg.input(webm_path).output(mp3_path).run(overwrite_output=True)
    except ffmpeg.Error as e:
        print(f"ffmpeg error: {e.stderr}")
        raise Exception(f"Error message: {e}")


def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


def run_stt(mp3_path, transcription_path, timestamp_path):
    audio_file = open(mp3_path, "rb")

    transcript1 = client.audio.transcriptions.create(
        model="whisper-1", file=audio_file, language="en"
    )

    transcript2 = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="verbose_json",
        language="en",
        timestamp_granularities=["word"],
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

    metadata_list = [file for file in os.listdir(META_DATA) if file.endswith(".json")]
    if metadata_list:
        ids = [int(file.split("_")[0]) for file in metadata_list]
        return max(ids) + 1
    else:
        return 1


def issue_lasso_id(project_id, page_num):
    """
    지정된 프로젝트와 페이지에 대해 새로운 lasso_id를 발급하는 함수.

    :param project_id: 프로젝트의 ID
    :param page_num: 페이지 번호
    :return: 새로운 lasso_id
    """
    lasso_path = os.path.join(LASSO, str(project_id), str(page_num))
    if not os.path.exists(lasso_path):
        os.makedirs(lasso_path, exist_ok=True)
        return 1

    existing_lasso_ids = [
        int(f.split(".")[0])
        for f in os.listdir(lasso_path)
        if f.split(".")[0].isdigit()
    ]

    if existing_lasso_ids:
        return max(existing_lasso_ids) + 1
    else:
        return 1


def issue_search_id(project_id):
    """
    지정된 프로젝트에 대해 새로운 search_id를 발급하는 함수.

    :param project_id: 프로젝트의 ID
    :return: 새로운 search_id
    """
    similarity_path = os.path.join(SIMILARITY, str(project_id))
    if not os.path.exists(similarity_path):
        os.makedirs(similarity_path, exist_ok=True)
        return 1

    existing_search_ids = [
        int(f.split(".")[0])
        for f in os.listdir(similarity_path)
        if f.split(".")[0].isdigit()
    ]

    if existing_search_ids:
        return max(existing_search_ids) + 1
    else:
        return 1


def issue_version(project_id):
    """
    특정 프로젝트 ID에 대한 버전을 발급하는 함수입니다.
    결과 디렉토리에서 프로젝트 ID와 일치하는 파일들을 찾아 가장 높은 버전 번호를 반환합니다.

    :param project_id: 프로젝트의 고유 ID입니다.
    """

    result_list = [
        file
        for file in os.listdir(RESULT)
        if file.startswith(f"{project_id}_") and file.endswith(".json")
    ]
    if result_list:
        versions = [int(file.split("_")[-1].split(".")[0]) for file in result_list]
        return max(versions) + 1
    else:
        return 1


def get_filename(id):
    """
    특정 ID에 해당하는 파일 이름을 반환하는 함수입니다.
    metadata 디렉토리에서 ID와 일치하는 파일을 찾아 파일 이름을 반환합니다.

    :param id: 찾고자 하는 파일의 ID입니다.
    """

    metadata_list = [file for file in os.listdir(META_DATA) if file.endswith(".json")]
    if metadata_list:
        for file in metadata_list:
            if file.startswith(f"{id}_"):
                # if file name is 1_0707_MX_0002_TEST.json, return 0707_MX_0002_TEST
                fn = os.path.basename(file).split(".")[0].split("_")[1:]
                fn = "_".join(fn)
                return fn
    else:
        return None


def keyword_api_request(script_segment):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {gpt_api_key}",
    }
    content = [
        {
            "type": "text",
            "text": (
                "Given the lecture script, identify at least one important keywords. "
                "Next, transform the script into a more formal tone, breaking it down into a bullet point structure where appropriate. "
                "The output should be in JSON format with the following structure: "
                '{"keyword": ["string", "string", ...], "formal": "string"} '
                f"lecture script: {script_segment} "
            ),
        },
    ]

    payload = {
        "model": "gpt-4o",
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant designed to output JSON.",
            },
            {"role": "user", "content": content},
        ],
        "max_tokens": 2000,
    }

    response = requests.post(
        "https://api.openai.com/v1/chat/completions", headers=headers, json=payload
    )
    return response.json()


def bbox_api_request(script_segment, encoded_image):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {gpt_api_key}",
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
                '{"bboxes": [{"script": "string", "bbox": [x, y, w, h]}]} '
                "Ensure that the value for script in the JSON response should be a sentence from the provided script, and the value must never be text extracted from the image. "
                f"script: {script_segment} "
                # "The bounding box is given in the form [x,y,w,h]. x and y represent the center position of the bounding box, "
                # "while w and h represent the width and height of the bounding box, respectively. "
                # "The coordinates are based on the top-left corner of the image being (0,0), with the x direction being vertical and the y direction being horizontal. "
                # "If a sentence in the script is highly relevant to a specific part of the image, "
                # "use the sentence as the key and provide the bounding box information of the specific part of the image as the value. "
                # "Only find bounding boxes for the sentences that are highly relevant to specific parts of the image. "
                # "The original format of the script, including uppercase and lowercase letters, punctuation marks such as periods and commas, must be preserved without any alterations."
            ),
        },
        # {"type": "text", "text": script_segment},
        {"type": "image_url", "image_url": {"url": encoded_image}},
    ]

    payload = {
        "model": GPT_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant designed to output JSON.",
            },
            {"role": "user", "content": content},
        ],
        "max_tokens": 2000,
    }

    response = requests.post(
        "https://api.openai.com/v1/chat/completions", headers=headers, json=payload
    )
    return response.json()


async def create_bbox_and_keyword(
    bbox_dir, keyword_dir, matched_paragraphs, encoded_images
):
    for i, encoded_image in enumerate(encoded_images):
        page_number = str(i + 1)
        script_segment = matched_paragraphs[page_number]
        response_data_bbox = bbox_api_request(script_segment, encoded_image)

        # Process the response data for bbox
        if "choices" in response_data_bbox and len(response_data_bbox["choices"]) > 0:
            script_text = response_data_bbox["choices"][0]["message"]["content"]
            # Convert the script text to JSON format
            try:
                script_data = json.loads(script_text)
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON for page {page_number}: {e}")
                script_data = {"error": "Failed to decode JSON"}
        else:
            print(
                f"Error: 'choices' key not found in the response for page {page_number}"
            )
            script_data = {"error": "Failed to retrieve scripts"}
        # Save the script data as a JSON file
        bbox_path = os.path.join(bbox_dir, f"{page_number}_spm.json")
        with open(bbox_path, "w") as json_file:
            json.dump(script_data, json_file, indent=4)

        response_data_keyword = keyword_api_request(script_segment)

        # Process the response data for keyword
        if (
            "choices" in response_data_keyword
            and len(response_data_keyword["choices"]) > 0
        ):
            script_text = response_data_keyword["choices"][0]["message"]["content"]

            # Convert the script text to JSON format
            try:
                script_data = json.loads(script_text)
                script_data = filter_script_data(script_data)
                script_data["original"] = script_segment
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON for page {page_number}: {e}")
                script_data = {"error": "Failed to decode JSON"}
        else:
            print(
                f"Error: 'choices' key not found in the response for page {page_number}"
            )
            script_data = {"error": "Failed to retrieve scripts"}

        ## 하나로 저장하고 싶으면 나중에 수정
        # final_data = {
        #     "bboxes": bbox_data.get("bboxes", []),
        #     "keyword": keyword_data.get("keyword", []),
        #     "formal": keyword_data.get("formal", ""),
        #     "original": script_segment
        # }

        keyword_path = os.path.join(keyword_path, f"{page_number}_spm.json")
        with open(keyword_path, "w") as json_file:
            json.dump(script_data, json_file, indent=4)


async def create_spm(script_content, encoded_images):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {gpt_api_key}",
    }

    content = [
        {
            "type": "text",
            "text": (
                "Given the following lecture notes images and the corresponding lecture script, "
                "please distribute the script content accurately to each page of the lecture notes. "
                'The output should be in the format: {"1": "script", "2": "script", ...}. '
                "Each key should correspond to the page number in the lecture notes where the script content appears, "
                "and the value should be the first sentence of the script content for that page. "
                "The value corresponding to a larger key must be a sentence that appears later in the script. "
                f"The number of dictionary keys must be equal to {len(encoded_images)}. "
                "The original format of the script, including uppercase and lowercase letters, punctuation marks such as periods and commas, must be preserved without any alterations."
            ),
        },
        {"type": "text", "text": script_content},
    ] + encoded_images

    payload = {
        "model": GPT_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant designed to output JSON.",
            },
            {"role": "user", "content": content},
        ],
        "max_tokens": 2000,
    }

    response = requests.post(
        "https://api.openai.com/v1/chat/completions", headers=headers, json=payload
    )
    response_data = response.json()

    if "choices" in response_data and len(response_data["choices"]) > 0:
        script_text = response_data["choices"][0]["message"]["content"]
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


async def prosodic_analysis(project_id):
    recording_path = f"{RECORDING}/{project_id}_recording.mp3"
    prosody_file_path = f"{RECORDING}/{project_id}_prosody_predictions.json"

    client = HumeBatchClient(hume_api_key)
    filepaths = [recording_path]

    # 음성 분석을 위한 설정을 구성합니다. 필요한 설정을 선택하세요.
    # language_config = LanguageConfig()  # 언어 감정 분석
    prosody_config = ProsodyConfig()  # 억양, 음조 분석

    # 작업을 제출합니다.
    job = client.submit_job(None, [prosody_config], files=filepaths)

    print(job)
    print("Running...")

    # 작업이 완료될 때까지 대기하고, 결과를 다운로드합니다.
    details = job.await_complete()
    job.download_predictions(prosody_file_path)
    print("Predictions downloaded to predictions.json")

    with open(prosody_file_path, "r") as file:
        data = json.load(file)

    prosodic_data = data[0]["results"]["predictions"][0]["models"]["prosody"][
        "grouped_predictions"
    ][0]["predictions"]

    # 각 segment에 대해 softmax를 적용하여 "relative_score" 계산 및 추가
    for segment in prosodic_data:
        scores = [item["score"] for item in segment["emotions"]]
        exp_scores = [math.exp(score) for score in scores]
        sum_exp_scores = sum(exp_scores)

    for item, exp_score in zip(segment["emotions"], exp_scores):
        item["relative_score"] = exp_score / sum_exp_scores

    with open(prosody_file_path, "w") as file:
        json.dump(data, file, indent=4)


async def create_lasso_answer(prompt_text, script_content, encoded_image):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {gpt_api_key}",
    }

    # Creating the content for the messages
    content = [
        {
            "type": "text",
            "text": (
                "Given the following image, which is a captured portion of a lecture notes page, and the lecture script, "
                f"please {prompt_text} in context based on the script, "
                "and please caption the image with a description that is no longer than three words. "
                'The output should be in the format: {"caption": "string", "result": "string"}. '
                f"Lecture script: {script_content} "
            ),
        },
    ] + encoded_image

    payload = {
        "model": GPT_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant designed to output JSON.",
            },
            {"role": "user", "content": content},
        ],
        "max_tokens": 2000,
    }

    response = requests.post(
        "https://api.openai.com/v1/chat/completions", headers=headers, json=payload
    )

    # Get the response
    response_data = response.json()

    if "choices" in response_data and len(response_data["choices"]) > 0:
        # 요약된 스크립트 내용 파싱
        result_text = response_data["choices"][0]["message"]["content"]

        try:
            result_data = json.loads(result_text)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            result_data = {"error": "Failed to decode JSON"}
    else:
        print("Error: 'choices' key not found in the response")
        result_data = {"error": "Failed to retrieve summary"}

    return result_data


async def transform_lasso_answer(lasso_answer, transform_type):
    """
    lasso_answer를 주어진 transform_type에 따라 변환하는 함수.

    :param lasso_answer: 원본 lasso_answer
    :param transform_type: 변환 타입 ('regenerate', 'shorten', 'bullet_point' 등)
    :return: 변환된 lasso_answer
    """

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {gpt_api_key}",
    }

    # 변환 타입에 따른 프롬프트 생성
    if transform_type == "regenerate":
        prompt = (
            "Please regenerate the following answer in a different way while keeping the meaning the same. "
            f"Answer: {lasso_answer['result']}"
        )
    elif transform_type == "shorten":
        prompt = (
            "Please shorten the following answer while retaining the key points. "
            f"Answer: {lasso_answer['result']}"
        )
    elif transform_type == "bullet_point":
        prompt = (
            "Please convert the following answer into a list of bullet points. "
            f"Answer: {lasso_answer['result']}"
        )
    else:
        raise ValueError(f"Unknown transform_type: {transform_type}")

    # OpenAI GPT-4 API 요청 준비
    payload = {
        "model": GPT_MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 2000,
    }

    # GPT-4 API 호출
    response = requests.post(
        "https://api.openai.com/v1/chat/completions", headers=headers, json=payload
    )
    response_data = response.json()

    # 응답에서 변환된 결과 추출
    if "choices" in response_data and len(response_data["choices"]) > 0:
        transformed_result = response_data["choices"][0]["message"]["content"]
        return {
            "caption": lasso_answer.get("caption", "untitled"),
            "result": transformed_result,
        }
    else:
        raise HTTPException(
            status_code=500, detail="Error processing transform with GPT-4"
        )


def match_paragraphs_1(script_content, first_sentences):
    matched_paragraphs = {}
    page_numbers = sorted(first_sentences.keys(), key=int)
    script_content_lower = script_content.lower()

    for i, page in enumerate(page_numbers):
        current_sentence = first_sentences[page].lower()
        next_sentence = (
            first_sentences[str(int(page) + 1)].lower()
            if i < len(page_numbers) - 1
            else None
        )

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
                matched_paragraphs[page] = script_content.split(
                    first_sentences[next_page_number].lower()
                )[0].strip()
            except:
                print(f"Error occurred at page {page}")
        elif i == len(page_numbers) - 1:
            try:
                matched_paragraphs[page] = (
                    first_sentences[page].lower()
                    + " "
                    + script_content.split(first_sentences[page].lower())[1].strip()
                )
            except:
                print(f"Error occurred at page {page}")
        else:
            try:
                matched_paragraphs[page] = (
                    first_sentences[page].lower()
                    + " "
                    + script_content.split(first_sentences[page].lower())[1]
                    .split(first_sentences[next_page_number].lower())[0]
                    .strip()
                )
            except:
                print(f"Error occurred at page {page}")
    return matched_paragraphs


def calculate_similarity(data, query):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    text_model = SentenceTransformer("all-MiniLM-L6-v2")  # Sentence Transformers 모델
    clip_model, preprocess = clip.load("ViT-B/32", device=device)

    # Query 텍스트 임베딩 계산
    query_embedding = text_model.encode(query, convert_to_tensor=True)

    results = {}

    for page, content in data.items():
        page_result = {}

        # script 유사도 계산
        if content["script"]:
            text_embedding = text_model.encode(
                content["script"], convert_to_tensor=True
            )
            page_result["script"] = util.pytorch_cos_sim(
                query_embedding, text_embedding
            ).item()
        else:
            page_result["script"] = 0.0

        # pdf_text 유사도 계산
        if content["pdf_text"]:
            pdf_text_embedding = text_model.encode(
                content["pdf_text"], convert_to_tensor=True
            )
            page_result["pdf_text"] = util.pytorch_cos_sim(
                query_embedding, pdf_text_embedding
            ).item()
        else:
            page_result["pdf_text"] = 0.0

        # annotation 유사도 계산
        if content["annotation"]:
            annotation_embedding = text_model.encode(
                content["annotation"], convert_to_tensor=True
            )
            page_result["annotation"] = util.pytorch_cos_sim(
                query_embedding, annotation_embedding
            ).item()
        else:
            page_result["annotation"] = 0.0
        # pdf_images 유사도 계산 (CLIP 사용)
        image_similarities = []
        for image_path in content["pdf_images"]:
            image = preprocess(Image.open(image_path)).unsqueeze(0).to(device)
            with torch.no_grad():
                image_features = clip_model.encode_image(image)
                image_features /= image_features.norm(dim=-1, keepdim=True)

                # Query 텍스트 임베딩도 CLIP을 사용해 계산
                text_tokens = clip.tokenize([query]).to(device)
                text_features = clip_model.encode_text(text_tokens)
                text_features /= text_features.norm(dim=-1, keepdim=True)

                similarity = (image_features @ text_features.T).item()
                image_similarities.append(similarity)

        # 여러 이미지가 있을 경우 평균 유사도 계산
        if image_similarities:
            page_result["pdf_image"] = sum(image_similarities) / len(image_similarities)
        else:
            page_result["pdf_image"] = 0.0

        results[page] = page_result

    return results


def get_pdf_text_and_image(project_id, pdf_path):
    doc = pymupdf.open(pdf_path)

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        images_info = page.get_image_info(xrefs=True)
        image_path = os.path.join(CROP, str(project_id), str(page_num + 1))
        os.makedirs(image_path, exist_ok=True)

        crop_images = []
        for image_index, img_info in enumerate(images_info):
            xref = img_info["xref"]  # 이미지의 xref 값
            base_image = doc.extract_image(xref)  # 이미지 데이터 추출
            image_bytes = base_image["image"]  # 이미지 바이트 데이터
            crop_path = os.path.join(image_path, f"{image_index + 1}.png")
            crop_images.append(crop_path)
            # 이미지 저장
            with open(crop_path, "wb") as img_file:
                img_file.write(image_bytes)

        return text, crop_images


def create_page_info(project_id, matched_paragraphs, word_timestamp):
    pdf_file = [
        file
        for file in os.listdir(PDF)
        if file.startswith(f"{project_id}_") and file.endswith(".pdf")
    ]
    if not pdf_file:
        raise HTTPException(status_code=404, detail="PDF file not found")
    if len(pdf_file) > 1:
        raise HTTPException(status_code=500, detail="Multiple PDF files found")
    pdf_path = os.path.join(PDF, pdf_file[0])
    real_timestamp_path = os.path.join(SCRIPT, f"{project_id}_real_timestamp.json")
    annnotation_path = os.path.join(ANNOTATIONS, f"{project_id}_annotation.json")

    with open(real_timestamp_path, "r") as file:
        real_timestamp = json.load(file)
    with open(annnotation_path, "r") as file:
        annotations = json.load(file)

    output = {}
    missed_parts = []
    offset = 0
    for para_id, paragraph_text in matched_paragraphs.items():
        words = paragraph_text.split()

        gpt_start_time = word_timestamp[offset]["start"]
        gpt_end_time = word_timestamp[offset + len(words) - 1]["end"]
        pdf_text, pdf_image = get_pdf_text_and_image(project_id, pdf_path)
        annotation = annotations[para_id]
        output["pages"][para_id] = {
            "script": paragraph_text,
            "pdf_text": pdf_text,
            "pdf_image": pdf_image,
            "annotation": annotation,
            "gpt_timestamp": {"start": gpt_start_time, "end": gpt_end_time},
            "user_timestamp": {
                "start": real_timestamp[para_id]["start"],
                "end": real_timestamp[para_id]["end"],
            },
        }
        if para_id != "1":
            prev_page = str(int(para_id) - 1)
            if (
                (
                    output[prev_page]["user_timestamp"]["end"]
                    - output[para_id]["gpt_timestamp"]["start"]
                )
                / (
                    output[para_id]["gpt_timestamp"]["end"]
                    - output[para_id]["gpt_timestamp"]["start"]
                )
            ) > miss_threshold:
                missed_parts.append(
                    [
                        output[para_id]["gpt_timestamp"]["start"],
                        output[prev_page]["user_timestamp"]["end"],
                    ]
                )

        offset += len(words)

    output["missed_parts"] = missed_parts

    return output


def timestamp_for_bbox(project_id, word_timestamp):
    for page_num in range(1, len(os.listdir(os.path.join(BBOX, str(project_id)))) + 1):
        bbox_path = os.path.join(BBOX, str(project_id), f"{page_num}_spm.json")

        # Load the bbox data for the current page
        with open(bbox_path, "r") as file:
            bboxes = json.load(file)

        updated_bboxes = []
        for item in bboxes["bboxes"]:
            bbox = item["bbox"]
            if not bbox or bbox[2] == 0 or bbox[3] == 0:
                continue

            start_time, end_time = get_script_times(item["script"], word_timestamp)
            if start_time is not None:
                item["start"] = start_time
                item["end"] = end_time
                updated_bboxes.append(item)

        # Save the updated data back to the JSON file
        bboxes["bboxes"] = updated_bboxes
        with open(bbox_path, "w") as file:
            json.dump(bboxes, file, indent=4)


def get_script_times(script_text, word_timestamp):
    # Remove punctuation from the script_text and split into words

    words = re.findall(r"\b[\w\']+\b", script_text.lower())

    start_time = None
    end_time = None

    if len(words) >= 3:
        for i in range(len(word_timestamp) - 2):
            if (
                word_timestamp[i]["word"].lower() == words[0]
                and word_timestamp[i + 1]["word"].lower() == words[1]
                and word_timestamp[i + 2]["word"].lower() == words[2]
            ):
                # Set start time from the first word
                start_time = word_timestamp[i]["start"]

                # Find end time from the last word in words
                for j in range(i + 2, len(word_timestamp)):
                    if word_timestamp[j]["word"].lower() == words[-1]:
                        end_time = word_timestamp[j]["end"]
                        break
                break

    return start_time, end_time


# 아래부터는 FastAPI 경로 작업입니다. 각각의 함수는 API 엔드포인트로, 특정 작업을 수행합니다.
@app.post("/api/lasso_transform/")
async def lasso_transform(
    project_id: int,
    page_num: int,
    lasso_id: int,
    version: int,
    prompt_text: str,
    transform_type: str,
):
    """
    lasso_answer에 대해 다양한 버전을 생성하는 API.

    :param project_id: 프로젝트 ID
    :param page_num: 페이지 번호
    :param lasso_id: Lasso ID
    :param prompt_text: 원본 프롬프트 텍스트
    :param transform_type: 적용할 변환 타입 ('regenerate', 'shorten', 'bullet_point' 등)
    """

    # Lasso answer가 저장된 경로 설정
    result_path = os.path.join(
        LASSO,
        str(project_id),
        str(page_num),
        str(lasso_id),
        sanitize_filename(prompt_text),
    )
    result_json_path = os.path.join(result_path, f"{version}.json")

    if not os.path.exists(result_json_path):
        raise HTTPException(status_code=404, detail="Original lasso answer not found")

    with open(result_json_path, "r") as json_file:
        lasso_answer = json.load(json_file)

    # 변환된 버전을 생성
    try:
        transformed_answer = await transform_lasso_answer(lasso_answer, transform_type)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error during transforming lasso answer: {e}"
        )

    # 변환된 내용 JSON 파일로 저장
    version_count = len([f for f in os.listdir(result_path) if f.endswith(".json")]) + 1
    transform_json_path = os.path.join(result_path, f"{version_count}.json")
    with open(transform_json_path, "w") as json_file:
        json.dump(transformed_answer, json_file, indent=4)

    return {
        "message": f"Lasso answer transformed successfully. Version: {version_count}"
    }


class Lasso_Query_Data(BaseModel):
    project_id: int
    page_num: int
    prompt_text: str
    image_url: str
    bbox: List[float]
    cur_lasso_id: Union[int, None]


@app.post("/api/lasso_query/")
async def lasso_query(data: Lasso_Query_Data):
    project_id, page_num, prompt_text, image_url, bbox, cur_lasso_id = (
        data.project_id,
        data.page_num,
        data.prompt_text,
        data.image_url,
        data.bbox,
        data.cur_lasso_id,
    )
    # 이미지 저장 경로 설정
    script_path = os.path.join(SCRIPT, f"{project_id}_transcription.json")
    lasso_id = cur_lasso_id if cur_lasso_id else issue_lasso_id(project_id, page_num)
    lasso_path = os.path.join(LASSO, f"{project_id}", f"{page_num}", f"{lasso_id}")
    os.makedirs(lasso_path, exist_ok=True)

    # 이미지 인코딩
    encoded_image = [{"type": "image_url", "image_url": {"url": f"{image_url}"}}]
    script_content = read_script(script_path)

    try:
        lasso_answer = await create_lasso_answer(
            prompt_text.lower(), script_content, encoded_image
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error during creating lasso answer: {e}"
        )

    if cur_lasso_id is None:
        caption = lasso_answer.get("caption", "untitled")
        lasso_info = {"name": caption, "bbox": bbox, "image_url": image_url}
        # lasso_path 경로에 info.json 파일로 저장
        info_json_path = os.path.join(lasso_path, "info.json")
        with open(info_json_path, "w") as json_file:
            json.dump(lasso_info, json_file, indent=4)

    # 요약된 내용 JSON 파일로 저장
    result_path = os.path.join(lasso_path, sanitize_filename(prompt_text))
    os.makedirs(result_path, exist_ok=True)

    result_json_path = os.path.join(result_path, "1.json")
    with open(result_json_path, "w") as json_file:
        json.dump(lasso_answer, json_file, indent=4)

    return {
        "message": "Lasso Answer is created successfully",
        "lasso_id": lasso_id,
        "response": lasso_answer,
    }


@app.post("/api/search_query/{project_id}", status_code=201)
async def search_query(project_id: int, search_query: str = Form(...)):
    """
    특정 프로젝트 ID에 대해 검색어를 입력받아 검색 결과를 반환하는 API 엔드포인트입니다.

    :param project_id: 프로젝트 ID
    :param search_text: 검색어
    """
    spm_path = os.path.join(SPM, f"{project_id}_page_info.json")
    similarity_path = os.path.join(SIMILARITY, str(project_id))

    with open(spm_path, "r") as file:
        page_info = json.load(file)

    result = {}
    # 유사도 계산
    similarities = calculate_similarity(page_info["pages"], search_query)
    result["query"] = search_query
    result["similarities"] = similarities

    search_id = issue_search_id(project_id)
    sim_json_path = os.path.join(similarity_path, f"{search_id}.json")
    with open(sim_json_path, "w") as file:
        json.dump(result, file, indent=4)

    return {
        "message": "Similarity for the Query is created successfully",
        "lasso_id": search_id,
        "response": result,
    }


@app.post("/api/activate_review/{project_id}", status_code=201)
async def activate_review(project_id: int):
    """
    GPT API를 이용하여 JSON 파일을 생성하고, 이를 후처리하여 최종 JSON 파일을 생성하는 API 엔드포인트입니다.

    :param project_id: 프로젝트 ID
    """

    metadata_file_path = os.path.join(META_DATA, f"{project_id}_metadata.json")
    image_directory = os.path.join(IMAGE, f"{str(project_id)}")
    script_path = os.path.join(SCRIPT, f"{project_id}_transcription.json")

    page_info_path = os.path.join(SPM, f"{project_id}_page_info.json")
    bbox_dir = os.path.join(BBOX, str(project_id))
    keyword_dir = os.path.join(KEYWORD, str(project_id))
    os.makedirs(bbox_dir, exist_ok=True)
    os.makedirs(keyword_dir, exist_ok=True)

    with open(os.path.join(SCRIPT, f"{project_id}_timestamp.json"), "r") as file:
        word_timestamp = json.load(file)

    image_paths = sorted(
        [
            os.path.join(image_directory, f)
            for f in os.listdir(image_directory)
            if f.lower().endswith(".png")
        ]
    )
    encoded_images = [
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{encode_image(image)}"},
        }
        for image in image_paths
    ]

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
        await create_bbox_and_keyword(
            bbox_dir, keyword_dir, matched_paragraphs, encoded_images
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during creating bbox: {e}")

    # Phase 3: Prosodic Analysis
    try:
        await prosodic_analysis(project_id)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error during prosodic analysis: {e}"
        )

    # Time Stamping for matched paragraphs (temporal)
    output = create_page_info(project_id, matched_paragraphs, word_timestamp)

    with open(page_info_path, "w") as json_file:
        json.dump(output, json_file, indent=4)

    # Time Stamping for bbox (spatial)
    timestamp_for_bbox(project_id, word_timestamp)

    # Update metadata file to enable review mode
    with open(metadata_file_path, "r") as f:
        data = json.load(f)
    data["reviewMode"] = True
    with open(metadata_file_path, "w") as file:
        json.dump(data, file)

    return JSONResponse(content={"id": id, "redirect_url": f"/viewer/{id}?mode=review"})


@app.get("/api/get_lasso_answer/{project_id}/{page_num}/{lasso_id}", status_code=200)
async def get_lasso_answer(
    project_id: int, page_num: int, lasso_id: int, prompt_text: str, version: int
):
    """
    특정 프로젝트 ID와 페이지 번호에 해당하는 lasso_id에 대한 답변을 반환하는 API 엔드포인트입니다.
    프로젝트 ID와 페이지 번호에 해당하는 lasso_id 디렉토리에서 prompt_text에 해당하는 JSON 파일을 찾아 반환합니다.

    :param project_id: 프로젝트 ID
    :param page_num: 페이지 번호
    :param lasso_id: lasso_id
    :param prompt_text: prompt_text
    :param version: 버전
    """

    lasso_answer_path = os.path.join(
        LASSO,
        str(project_id),
        str(page_num),
        str(lasso_id),
        sanitize_filename(prompt_text),
        f"{version}.json",
    )

    if not os.path.exists(lasso_answer_path):
        raise HTTPException(status_code=404, detail="Generated JSON files not found")

    try:
        with open(lasso_answer_path, "r") as lasso_answer_file:
            lasso_answer_data = json.load(lasso_answer_file)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error reading lasso answer file: {e}"
        )

    return lasso_answer_data


@app.get("/api/get_search_result/{project_id}/{search_id}", status_code=200)
async def get_search_result(project_id: int, search_id: int):
    """
    특정 프로젝트 ID와 search_id에 해당하는 검색 결과를 반환하는 API 엔드포인트입니다.
    프로젝트 ID와 search_id 디렉토리에서 JSON 파일을 찾아 반환합니다.

    :param project_id: 프로젝트 ID
    :param search_id: search_id
    """

    similarity_path = os.path.join(SIMILARITY, str(project_id), f"{search_id}.json")

    if not os.path.exists(similarity_path):
        raise HTTPException(status_code=404, detail="Generated JSON files not found")

    try:
        with open(similarity_path, "r") as similarity_file:
            similarity_data = json.load(similarity_file)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error reading similarity file: {e}"
        )

    return similarity_data


@app.get("/api/get_page_info/{project_id}", status_code=200)
async def get_page_info(project_id: int):
    """
    생성된 page_info 파일을 가져오는 API 엔드포인트입니다.

    :param project_id: 프로젝트 ID
    """
    page_info_path = os.path.join(SPM, f"{project_id}_page_info.json")

    if not os.path.exists(page_info_path):
        raise HTTPException(status_code=404, detail="Generated JSON files not found")

    try:
        with open(page_info_path, "r") as page_info_file:
            page_info_data = json.load(page_info_file)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error reading page info file: {e}"
        )

    return page_info_data


@app.get("/api/get_missed_parts/{project_id}", status_code=200)
async def get_missed_parts(project_id: int):
    """
    특정 프로젝트 ID에 해당하는 missed parts을 반환하는 API 엔드포인트입니다.
    프로젝트 ID에 해당하는 JSON 파일을 찾아 반환합니다.

    :param project_id: 프로젝트 ID
    """

    page_info_path = os.path.join(SPM, f"{project_id}_page_info.json")

    if not os.path.exists(page_info_path):
        raise HTTPException(status_code=404, detail="Generated JSON files not found")

    try:
        with open(page_info_path, "r") as page_info_file:
            page_info_data = json.load(page_info_file)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error reading page info file: {e}"
        )

    return page_info_data["missed_parts"]


@app.get("/api/get_matched_paragraphs/{project_id}", status_code=200)
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
        raise HTTPException(
            status_code=500, detail=f"Error reading matched paragraphs file: {e}"
        )

    return matched_data


@app.get("/api/get_bbox/{project_id}", status_code=200)
async def get_bbox(project_id: int, page_num: int):
    """
    생성된 bbox 파일을 가져오는 API 엔드포인트입니다.

    :param project_id: 프로젝트 ID
    """
    bbox_path = os.path.join(BBOX, str(project_id), f"{page_num}_spm.json")
    image_path = os.path.join(
        IMAGE, str(project_id), f"page_{str(page_num).zfill(4)}.png"
    )

    image = Image.open(image_path)
    width, height = image.size

    if not os.path.exists(bbox_path):
        raise HTTPException(status_code=404, detail="Generated JSON files not found")

    try:
        with open(bbox_path, "r") as bbox_file:
            bbox_data = json.load(bbox_file)
            bbox_data["image_size"] = {"width": width, "height": height}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading bbox file: {e}")

    return bbox_data


@app.get("/api/get_keyword/{project_id}", status_code=200)
async def get_keyword(project_id: int, page_num: int):
    """
    생성된 keyword 파일을 가져오는 API 엔드포인트입니다.

    :param project_id: 프로젝트 ID
    """
    keyword_path = os.path.join(KEYWORD, str(project_id), f"{page_num}_spm.json")

    if not os.path.exists(keyword_path):
        raise HTTPException(status_code=404, detail="Generated JSON files not found")

    try:
        with open(keyword_path, "r") as keyword_file:
            keyword_data = json.load(keyword_file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading keyword file: {e}")

    return keyword_data


@app.get("/api/get_recording/{project_id}", status_code=200)
async def get_recording(project_id: int):
    """
    특정 프로젝트 ID에 해당하는 녹음 파일을 반환하는 API 엔드포인트입니다.
    프로젝트 ID와 일치하는 녹음 파일을 찾아 FileResponse 객체로 반환합니다.

    :param project_id: 조회하고자 하는 프로젝트의 ID입니다.
    """

    recording_file = [
        file
        for file in os.listdir(RECORDING)
        if file.startswith(f"{project_id}_") and file.endswith(".mp3")
    ]

    if not recording_file:
        raise HTTPException(status_code=404, detail="Recording file not found")

    if len(recording_file) > 1:
        raise HTTPException(status_code=500, detail="Multiple recording files found")
    else:
        return FileResponse(os.path.join(RECORDING, recording_file[0]))


@app.get("/api/get_prosody/{project_id}", status_code=200)
async def get_prosody(project_id: int):
    """
    특정 프로젝트 ID에 해당하는 prosody 파일을 반환하는 API 엔드포인트입니다.
    프로젝트 ID와 일치하는 prosody 파일을 찾아 JSON 파일로 반환합니다.

    :param project_id: 조회하고자 하는 프로젝트의 ID입니다.
    """

    prosody_file = [
        file
        for file in os.listdir(RECORDING)
        if file.startswith(f"{project_id}_") and file.endswith(".json")
    ]

    if not prosody_file:
        raise HTTPException(status_code=404, detail="Prosody file not found")

    if len(prosody_file) > 1:
        raise HTTPException(status_code=500, detail="Multiple prosody files found")
    else:
        with open(os.path.join(RECORDING, prosody_file[0]), "r") as f:
            json_data = json.load(f)

            predictions = json_data[0]["results"]["predictions"][0]["models"][
                "prosody"
            ]["grouped_predictions"][0]["predictions"]
            result = []

            for pred in predictions:
                res = {"begin": pred["time"]["begin"], "end": pred["time"]["end"]}
                for emotion in pred["emotions"]:
                    res[emotion["name"]] = emotion["relative_score"]

                result.append(res)

            df = pd.DataFrame(result)
            columns_to_roll = [col for col in df.columns if col not in ["begin", "end"]]

            rolling_means = df[columns_to_roll].rolling(window=WINDOW_SIZE).mean()

            interval = WINDOW_SIZE
            result_filtered = df.iloc[WINDOW_SIZE - 1 :: interval].copy()

            result_filtered["begin"] = df.iloc[0::interval]["begin"].values
            result_filtered["end"] = df["end"].iloc[WINDOW_SIZE - 1 :: interval].values

            for col in columns_to_roll:
                result_filtered[col] = rolling_means.iloc[WINDOW_SIZE - 1 :: interval][
                    col
                ].values

            json_result = result_filtered.to_dict(orient="records")

            return json_result


class TimestampRecord(BaseModel):
    pageNum: int
    start: int
    end: int


@app.post("/api/save_recording/{project_id}", status_code=200)
async def save_recording(
    project_id: int, recording: UploadFile = File(...), timestamp: str = Form(...)
):
    webm_path = os.path.join(RECORDING, f"{project_id}_recording.webm")
    mp3_path = os.path.join(RECORDING, f"{project_id}_recording.mp3")
    transcription_path = os.path.join(SCRIPT, f"{project_id}_transcription.json")
    gpt_timestamp_path = os.path.join(SCRIPT, f"{project_id}_gpt_timestamp.json")
    real_timestamp_path = os.path.join(SCRIPT, f"{project_id}_real_timestamp.json")
    annnotation_path = os.path.join(ANNOTATIONS, f"{project_id}_annotation.json")
    drawings_dir = os.path.join(ANNOTATIONS, f"{project_id}")
    os.makedirs(drawings_dir, exist_ok=True)

    # JSON 문자열을 파싱하여 TimestampRecord 리스트로 변환
    try:
        timestamp_data = json.loads(timestamp)
        timestamps = [TimestampRecord(**item) for item in timestamp_data]
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for timestamp")

    # JSON 문자열을 파싱하여 drawings 리스트로 변환
    try:
        drawings_data = json.loads(drawings)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for drawings")

    # Save real timestamp
    dic = defaultdict(list)
    for ele in timestamps:
        dic[ele.pageNum].append(ele)
    result = {}
    for page_number, elements in dic.items():
        max_diff_element = max(elements, key=lambda x: x.end - x.start)
        result[str(page_number)] = {
            "start": max_diff_element.start / 1000,
            "end": max_diff_element.end / 1000,
        }
    with open(real_timestamp_path, "w") as json_file:
        json.dump(result, json_file, indent=4)

    # Perform OCR on each drawing and save the extracted text
    # annotation_image = {}
    # annotation_image['url'] = drawings
    # with open(annnotation_path, "w") as json_file:
    #     json.dump(annotation_image, json_file, indent=4)

    print("length of drawings: ", len(drawings_data))
    ocr_results = {}
    for i in range(len(drawings_data) // 2):  # 절반만 순회
        image = decode_base64_image(drawings_data[i])
        image_path = os.path.join(drawings_dir, f"{i + 1}.png")
        image.save(image_path)
        remove_transparency(image_path)
        text = detect_handwritten_text(image_path)
        ocr_results[str(i + 1)] = text.strip()

    with open(annnotation_path, "w") as json_file:
        json.dump(ocr_results, json_file, indent=4)

    # save recording file
    with open(webm_path, "wb") as buffer:
        shutil.copyfileobj(recording.file, buffer)

    # webm 파일을 mp3로 변환
    try:
        convert_webm_to_mp3(webm_path, mp3_path)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro during converting webm to mp3: {e}"
        )

    # STT 모델 실행
    try:
        executor.submit(run_stt, mp3_path, transcription_path, gpt_timestamp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during STT: {e}")

    return {"message": "Recording saved and STT processing started successfully"}


@app.post("/api/save_annotated_pdf/{project_id}", status_code=200)
async def save_annotated_pdf(project_id: int, annotated_pdf: UploadFile = File(...)):
    pdf_file = [
        file
        for file in os.listdir(PDF)
        if file.startswith(f"{project_id}_") and file.endswith(".pdf")
    ]

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

@app.post("/api/make_search_set/{project_id}", status_code=200)
async def make_search_set(project_id: int, search_id: int, page_set: List[str] = Form(...)):
    """
    특정 프로젝트 ID에 대해 검색 결과를 저장하는 API 엔드포인트입니다.
    프로젝트 ID와 search_id 디렉토리에 page_set을 JSON 파일로 저장합니다.

    :param project_id: 프로젝트 ID
    :param search_id: search_id
    :param page_set: 검색 결과 페이지 번호 리스트
    """

    search_path = os.path.join(SIMILARITY, str(project_id), f"{search_id}.json")

    if not os.path.exists(search_path):
        raise HTTPException(status_code=404, detail="Generated JSON files not found")

    try:
        with open(search_path, "r") as search_file:
            search_data = json.load(search_file)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error reading search file: {e}"
        )

    search_data["page_set"] = page_set

    with open(search_path, "w") as search_file:
        json.dump(search_data, search_file, indent=4)

    return {"message": "Search set saved successfully"}

@app.get("/api/get_project", status_code=200)
async def get_project():
    """
    모든 프로젝트 목록을 반환하는 API 엔드포인트입니다.
    metadata 파일들을 읽어 프로젝트 정보를 리스트 형태로 반환합니다.
    """
    print("Getting project list")

    metadata_list = [file for file in os.listdir(META_DATA) if file.endswith(".json")]
    print(metadata_list)
    project_list = []

    for metadata in metadata_list:
        with open(os.path.join(META_DATA, metadata), "r") as f:
            project_list.append(json.load(f))

    project_list.sort(key=lambda x: x["id"])

    return {"projects": project_list}


@app.get("/api/get_project/{project_id}", status_code=200)
async def get_project(project_id: int):
    """
    특정 프로젝트 ID에 해당하는 프로젝트 정보를 반환하는 API 엔드포인트입니다.
    프로젝트 ID와 일치하는 metadata 파일을 찾아 해당 정보를 반환합니다.

    :param project_id: 조회하고자 하는 프로젝트의 ID입니다.
    """

    metadata_file = [
        file
        for file in os.listdir(META_DATA)
        if file.startswith(f"{project_id}_") and file.endswith(".json")
    ]

    if not metadata_file:
        raise HTTPException(status_code=404, detail="Project not found")

    if len(metadata_file) > 1:
        raise HTTPException(status_code=500, detail="Multiple projects found")
    else:
        with open(os.path.join(META_DATA, metadata_file[0]), "r") as f:
            return {"project": json.load(f)}


@app.get("/api/get_pdf/{project_id}", status_code=200)
async def get_pdf(project_id: int):
    """
    특정 프로젝트 ID에 해당하는 pdf 파일을 반환하는 API 엔드포인트입니다.
    프로젝트 ID와 일치하는 pdf 파일을 찾아 FileResponse 객체로 반환합니다.

    :param project_id: 조회하고자 하는 프로젝트의 ID입니다.
    """

    pdf_file = [
        file
        for file in os.listdir(PDF)
        if file.startswith(f"{project_id}_") and file.endswith(".pdf")
    ]

    if not pdf_file:
        raise HTTPException(status_code=404, detail="Pdf file not found")

    if len(pdf_file) > 1:
        raise HTTPException(status_code=500, detail="Multiple pdf files found")
    else:
        return FileResponse(
            os.path.join(PDF, pdf_file[0]), media_type="application/pdf"
        )


@app.get("/api/get_toc/{project_id}", status_code=200)
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
        with open(toc_file_path, "r") as f:
            toc_data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading TOC file: {str(e)}")

    return toc_data["table_of_contents"]


@app.get("/api/get_result/{project_id}", status_code=200)
async def get_result(project_id: int):
    """
    특정 프로젝트 ID에 해당하는 결과 데이터를 반환하는 API 엔드포인트입니다.
    프로젝트 ID와 일치하는 결과 파일을 찾아 해당 데이터를 반환합니다.

    :param project_id: 조회하고자 하는 프로젝트의 ID입니다.
    """

    result_file = [
        file
        for file in os.listdir(RESULT)
        if file.startswith(f"{project_id}_") and file.endswith(".json")
    ]

    if not result_file:
        raise HTTPException(status_code=404, detail="Result not found")

    if len(result_file) > 1:
        result_file = sorted(
            result_file, key=lambda x: int(x.split("_")[-1].split(".")[0])
        )
        with open(os.path.join(RESULT, result_file[-1]), "r") as f:
            data = json.load(f)
        return {"result": data}
    else:
        with open(os.path.join(RESULT, result_file[0]), "r") as f:
            data = json.load(f)
        return {"result": data}


@app.delete("/api/delete_project/{project_id}", status_code=200)
async def delete_project(project_id: int):
    """
    특정 프로젝트 ID에 해당하는 모든 관련 파일을 삭제하는 API 엔드포인트입니다.
    프로젝트와 관련된 모든 디렉토리에서 ID와 일치하는 파일들을 찾아 삭제합니다.

    :param project_id: 삭제할 프로젝트의 ID입니다.
    """

    def delete_project_files(directory):
        if not os.path.exists(directory):
            return
        # 프로젝트 ID가 폴더명인 경우 해당 폴더 삭제
        project_dir = os.path.join(directory, str(project_id))
        if os.path.isdir(project_dir):
            shutil.rmtree(project_dir)
            return

        for file in os.listdir(directory):
            if file.startswith(f"{project_id}_"):
                os.remove(os.path.join(directory, file))

    try:
        delete_project_files(PDF)
        delete_project_files(META_DATA)
        delete_project_files(IMAGE)
        delete_project_files(SCRIPT)
        delete_project_files(SPM)
        delete_project_files(BBOX)
        delete_project_files(RECORDING)
        delete_project_files(TOC)
        delete_project_files(LASSO)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during deletion: {e}")

    return {"detail": "Project deleted successfully"}


@app.options("/api/update_result/{project_id}", status_code=200)
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

    with open(result_file_path, "w") as f:
        json.dump(result, f)

    return {"id": project_id, "version": version}


@app.post("/api/upload_project", status_code=201)
async def upload_project(
    userID: str = Form(...),
    insertDate: str = Form(...),
    updateDate: str = Form(...),
    userName: str = Form(...),
    file: UploadFile = File(...),
):
    """
    새 프로젝트를 업로드하는 API 엔드포인트입니다.
    프로젝트 metadata를 생성하고, PDF 파일을 서버에 저장합니다.
    :param userID, insertDate, updateDate, userName: 프로젝트 metadata 입니다.
    :param file: 업로드할 PDF 파일입니다.
    """

    id = issue_id()

    metadata = {
        "id": id,
        "userID": userID,
        "insertDate": insertDate,
        "updateDate": updateDate,
        "userName": userName,
        "done": False,
        "reviewMode": False,
    }

    pdf_filename = os.path.splitext(file.filename)[0]

    pdf_file_path = f"{PDF}/{id}_{file.filename}"
    with open(pdf_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    metadata_file_path = f"{META_DATA}/{id}_metadata.json"
    with open(metadata_file_path, "w") as f:
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
    with open(toc_json_path, "w") as json_file:
        json.dump(toc_data, json_file, indent=4)

    metadata["done"] = True
    with open(metadata_file_path, "w") as f:
        json.dump(metadata, f)

    executor.submit(metadata_file_path, pdf_file_path)

    return JSONResponse(
        content={"id": id, "redirect_url": f"/viewer/{id}?mode=default"}
    )


async def create_toc(project_id: int, image_dir: str):
    # Encode images to base64
    image_paths = sorted(
        [
            os.path.join(image_dir, f)
            for f in os.listdir(image_dir)
            if f.lower().endswith(".png")
        ]
    )
    encoded_images = [
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{encode_image(image)}"},
        }
        for image in image_paths
    ]

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {gpt_api_key}",
    }

    # Creating the content for the messages
    content = [
        {
            "type": "text",
            "text": (
                "Extract a detailed table of contents with page numbers from the following images. "
                "Each section should have a unique title, and the subsections should be grouped under these main sections. "
                "The page numbers should start from 1 and each page number should be in an array. "
                "Ensure there are more than 4 main sections. "
                "The output should be in JSON format with the structure: "
                '{"table_of_contents": [{"title": "string", "subsections": [{"title": "string", "page": ["number"]}]}]} '
                "and include all pages starting from 1."
            ),
        }
    ] + encoded_images

    payload = {
        "model": GPT_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant designed to output JSON.",
            },
            {"role": "user", "content": content},
        ],
        "max_tokens": 2000,
    }

    response = requests.post(
        "https://api.openai.com/v1/chat/completions", headers=headers, json=payload
    )

    # Get the response
    response_data = response.json()

    # Check if 'choices' key exists in the response
    if "choices" in response_data and len(response_data["choices"]) > 0:
        # Parse the table of contents from the response
        toc_text = response_data["choices"][0]["message"]["content"]

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
@app.post("/test/upload_video/")
async def upload_file(file: UploadFile = File(...)):
    with zipfile.ZipFile("return.zip", "w") as zf:
        zf.write("./test_file/test.json")
        zf.write("./test_file/test.csv")
    os.remove("return.zip")
    return FileResponse("return.zip", media_type="application/zip")


@app.get("/test/download_video")
async def test_download_video():
    return FileResponse("test_file/0707_MX_0002_TEST.mp4", media_type="video/mp4")


@app.get("/test/download_csv")
async def test_download_csv():
    return FileResponse("test_file/X_fv_0701_MX_0001.csv", media_type="text/csv")


@app.get("/test/get_json")
async def test_get_json():
    # return FileResponse('test_file/0707_MX_0002_TEST.json', media_type='application/json')
    # jsonify
    with open("test_file/0707_MX_0002_TEST.json") as f:
        data = json.load(f)
    return data


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=9998)

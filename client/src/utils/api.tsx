import axios from 'axios';
import jsPDF from "jspdf";

import {defaultPrompts} from "@/app/recoil/LassoState";

const SERVER_ENDPOINT = process.env.SERVER_ENDPOINT || "http://localhost:8000/";

// export async function saveAnnotations(projectId: string, annotations: any[]) {
//     const response = await axios.post(SERVER_ENDPOINT + `api/save_annotations/${projectId}`, annotations);
//     return response.data;
// }

// export async function loadAnnotations(projectId: string) {
//     const response = await axios.get(SERVER_ENDPOINT + `api/load_annotations/${projectId}`);
//     return response.data;
// }

// export async function updatePdf(project_id: string, annotations: any) {
//     const response = await axios.options(SERVER_ENDPOINT+`api/update_pdf/${project_id}`, { data: annotations });
//     return response.data;
// }

export async function saveSearchSet(projectId: string, searchId: string, searchType: string, pageSet: string[]) {
    const formData = new FormData();
    formData.append('search_type', searchType); // 추가된 search_type 파라미터
    formData.append('page_set', JSON.stringify(pageSet)); // 선택된 페이지 번호 리스트
  
    const response = await axios.post(
      `${SERVER_ENDPOINT}api/make_search_set/${projectId}`,
      formData,
      {
        params: {
          search_id: searchId,
        },
      }
    );
  
    return response.data;
  }

export async function searchQuery(projectId: string, searchQuery: string, searchType: string) {
    const formData = new FormData();
    formData.append('search_query', searchQuery);
    formData.append('search_type', searchType);

    const response = await axios.post(`${SERVER_ENDPOINT}api/search_query/${projectId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });

    return response.data;
}

export async function activateReview(projectId: string) {
    const response = await axios.post(`${SERVER_ENDPOINT}api/activate_review/${projectId}`);

    return response.data;
}

export async function saveRecording(projectId: string, formData: FormData) {
    const response = await axios.post(SERVER_ENDPOINT + `api/save_recording/${projectId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
}

export async function saveAnnotatedPdf(projectId: string, drawings: string[]) {
    const response = await axios.post(SERVER_ENDPOINT + `api/save_annotated_pdf/${projectId}`, {
      annotations: drawings
    });

    return response.data;
  }

export async function getProjectList() {
    const response = await axios.get(SERVER_ENDPOINT+'api/get_project');
    return response.data;
}

export async function postProject({ metadata, file }) {
    const formData = new FormData();
    formData.append('userID', metadata.userID);
    formData.append('insertDate', metadata.insertDate);
    formData.append('updateDate', metadata.updateDate);
    formData.append('userName', metadata.userName);
    formData.append('file', file);

    const response = await axios.post(SERVER_ENDPOINT+'api/upload_project', formData);
    return response.data;
}

export async function getProject({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_project/${project_id}`);
    return response.data;
}

export async function getPdf({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_pdf/${project_id}`, { responseType: 'blob' });
    return response.data;
}

export async function getTableOfContents({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_toc/${project_id}`);
    return response.data;
}

export async function getMatchParagraphs({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_matched_paragraphs/${project_id}`);
    return response.data;
}

export async function getPageInfo({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_page_info/${project_id}`);
    return response.data;
}

export async function getKeywords({queryKey}: {queryKey: string[]}) {
    const [_key, project_id, page_num] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_keyword/${project_id}`, {
        params: {
            page_num: page_num
        }
    });
    return response.data;
}

export async function getSearchResult({queryKey}: {queryKey: string[]}) {
    const [_key, project_id, search_id, search_type] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_search_result/${project_id}`, {
        params: {
            search_id: search_id,
            search_type: search_type
        }
    });
    return response.data;
}

export async function getSemanticSearchSets({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_search_sets/${project_id}`, {
        params: {
            search_type: 'semantic'
        }
    });
    return response.data;
}

export async function getKeywordSearchSets({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_search_sets/${project_id}`, {
        params: {
            search_type: 'keyword'
        }
    });
    return response.data;
}

export async function getBbox({queryKey}: {queryKey: string[]}) {
    const [_key, project_id, page_num] = queryKey;
    const response = await axios.get(`${SERVER_ENDPOINT}api/get_bbox/${project_id}`, {
        params: {
            page_num: page_num
        }
    });
    return response.data;
}

export async function getRecording({ queryKey }: { queryKey: string[] }) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT + `api/get_recording/${project_id}`, {
        responseType: 'blob' // 녹음 파일을 바이너리 데이터(blob)로 받아옵니다.
    });

    // URL.createObjectURL을 통해 blob을 다룰 수 있는 객체 URL을 만듭니다.
    const audioUrl = URL.createObjectURL(response.data);

    return audioUrl;
}


export async function getKeypoint({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_keypoint/${project_id}`);
    return response.data;
}

export async function getResult({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_result/${project_id}`);
    return response.data;
}

export async function getCSV({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_csv/${project_id}`, { responseType: 'blob' });
    return response.data;
}

export async function getProsody({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    console.log(SERVER_ENDPOINT+`api/get_prosody/${project_id}`);
    const response = await axios.get(SERVER_ENDPOINT+`api/get_prosody/${project_id}`);
    console.log(response.data);
    return response.data;
}

export async function getImages(projectId: string) {
    const response = await axios.get(`${SERVER_ENDPOINT}api/get_images/${projectId}`);
    return response.data; // 이 데이터는 Base64로 인코딩된 이미지들의 배열입니다.
}

export async function getMissedAndImportantParts(projectId: string) {
    const response_missed = await axios.get(`${SERVER_ENDPOINT}api/get_missed_parts/${projectId}`);
    const response_important = await axios.get(`${SERVER_ENDPOINT}api/get_important_parts/${projectId}`);

    return {missed: response_missed.data, important: response_important.data};
}

export async function updateResult({project_id, result}: {project_id: string, result: any}) {
    const response = await axios.options(SERVER_ENDPOINT+`api/update_result/${project_id}`, {data: result});
    return response.data;
}

export async function getTestVideo() {
    const response = await axios.get(SERVER_ENDPOINT+'test/download_video', { responseType: 'blob' });
    return response.data;
}

export async function getTestCSV() {
    const response = await axios.get(SERVER_ENDPOINT+'test/download_csv', { responseType: 'blob' });
    return response.data;
}

export async function getTestKeypoint() {
    const response = await axios.get(SERVER_ENDPOINT+'test/get_json');
    return response.data;
}


export async function deleteProject(projectId: string) {
    const response = await axios.delete(`${SERVER_ENDPOINT}api/delete_project/${projectId}`);
    return response.data;
}

export async function lassoQuery(projectId: string, pageNumber: number, prompt: string, image: string, boundingBox: number[], lassoId: number | null) {
  const response = await axios.post(`${SERVER_ENDPOINT}api/lasso_query/`, {
    project_id: projectId,
    page_num: pageNumber,
    prompt_text: prompt,
    image_url: image,
    bbox: boundingBox,
    cur_lasso_id: lassoId
  });

  return response.data;
}

export async function lassoPrompts(projectId: string, pageNumber: number, lassoId: number | null) {
  try {
  const response = await axios.get(`${SERVER_ENDPOINT}api/lasso_prompts/`, {
      params: {
        project_id: projectId,
        page_num: pageNumber,
        lasso_id: lassoId
      }
    });

    return response.data;
  } catch (error) {
    console.log(error);
    return defaultPrompts.map((prompt) => prompt.prompt);
  }
}

export async function addLassoPrompt(projectId: string, pageNumber: number, lassoId: number | null, prompt: string) {
  const response = await axios.post(`${SERVER_ENDPOINT}api/add_lasso_prompt/`, {
    project_id: projectId,
    page_num: pageNumber,
    lasso_id: lassoId,
    prompt_text: prompt
  });

  return response.data;
}

export async function getLassosOnPage(projectId: string, pageNumber: number) {
  try {
    const response = await axios.get(`${SERVER_ENDPOINT}api/get_lassos_on_page/${projectId}/${pageNumber}`);

    return response.data;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getLassoInfo(projectId: string, pageNumber: number, lassoId: number | null) {
  try {
    const response = await axios.get(`${SERVER_ENDPOINT}api/get_lasso_info/${projectId}/${pageNumber}/${lassoId}`);

    return response.data;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function lassoTransform(projectId: string, pageNumber: number, lassoId: number | null, version: number, prompt: string, transformType: string) {
  const response = await axios.post(`${SERVER_ENDPOINT}api/lasso_transform/${projectId}/${pageNumber}/${lassoId}/${version}`, {
    prompt_text: prompt,
    transform_type: transformType
  });

  return response.data;
}

export async function getLassoAnswer(projectId: string, pageNumber: number, lassoId: number | null, prompt: string, version: number) {
  const response = await axios.get(`${SERVER_ENDPOINT}api/get_lasso_answer/${projectId}/${pageNumber}/${lassoId}`, {
    params: {
      prompt_text: prompt,
      version: version
  }});

  return response.data;
}

export async function getLassoAnswers(projectId: string, pageNumber: number, lassoId: number | null, prompt: string) {
  const response = await axios.get(`${SERVER_ENDPOINT}api/get_lasso_answers/${projectId}/${pageNumber}/${lassoId}`, {
    params: {
      prompt_text: prompt
  }});

  return response.data;
}
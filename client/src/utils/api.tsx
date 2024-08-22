import axios from 'axios';
import jsPDF from "jspdf";

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

export async function saveAnnotatedPdf(projectId: string, drawings: Record<number, string>, numPages: number) {
    const pdfDoc = new jsPDF();

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (pageNum > 1) {
        pdfDoc.addPage();
      }

      const imgData = drawings[pageNum];
      if (imgData) {
        pdfDoc.addImage(imgData, 'PNG', 0, 0, pdfDoc.internal.pageSize.getWidth(), pdfDoc.internal.pageSize.getHeight());
      }
    }

    const pdfBlob = pdfDoc.output('blob');

    const formData = new FormData();
    formData.append('annotated_pdf', pdfBlob, 'annotated.pdf');

    const response = await axios.post(SERVER_ENDPOINT + `api/save_annotated_pdf/${projectId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
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
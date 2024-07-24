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
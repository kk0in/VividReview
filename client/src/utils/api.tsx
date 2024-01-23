import axios from 'axios';

const SERVER_ENDPOINT = process.env.SERVER_ENDPOINT

export async function getProjectList() {
    const response = await axios.get(SERVER_ENDPOINT+'api/get_project');
    return response.data;
}

export async function postProject({ metadata, file }) {
    const formData = new FormData();
    formData.append('gbm', metadata.gbm);
    formData.append('product', metadata.product);
    formData.append('plant', metadata.plant);
    formData.append('route', metadata.route);
    formData.append('userID', metadata.userID);
    formData.append('insertDate', metadata.insertDate);
    formData.append('updateDate', metadata.updateDate);
    formData.append('description', metadata.description);
    formData.append('file', file);

    const response = await axios.post(SERVER_ENDPOINT+'api/upload_project', formData);
    return response.data;
}

export async function getProject({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_project/${project_id}`);
    return response.data;
}

export async function getVideo({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_video/${project_id}`, { responseType: 'blob' });
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
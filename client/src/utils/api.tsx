import axios from 'axios';

const SERVER_ENDPOINT = 'http://gpu3.hcil.snu.ac.kr:9998/'

export async function postNewProejct({ metadata, file }) {
    const formData = new FormData();
    formData.append('gbm', metadata.gbm);
    formData.append('product', metadata.product);
    formData.append('plant', metadata.plant);
    formData.append('route', metadata.route);
    formData.append('description', metadata.description);
    formData.append('file', file);

    const response = await axios.post(SERVER_ENDPOINT+'api/uploadfile', formData);

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
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
        headers: {
          "ngrok-skip-browser-warning": "69420",
        }
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
            'Content-Type': 'multipart/form-data',
            "ngrok-skip-browser-warning": "69420",
        }
    });

    return response.data;
}

export async function activateReview(projectId: string) {
    const response = await axios.post(`${SERVER_ENDPOINT}api/activate_review/${projectId}`, {
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });

    return response.data;
}

export async function saveRecording(projectId: string, formData: FormData) {
    const response = await axios.post(SERVER_ENDPOINT + `api/save_recording/${projectId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            "ngrok-skip-browser-warning": "69420",
        }
    });
    return response.data;
}

export async function saveAnnotatedPdf(projectId: string, drawings: string[]) {
    const response = await axios.post(SERVER_ENDPOINT + `api/save_annotated_pdf/${projectId}`, {
      headers: {
        "ngrok-skip-browser-warning": "69420",
      },
      annotations: drawings
    });

    return response.data;
  }

export async function getProjectList() {
    const response = await axios.get(SERVER_ENDPOINT+'api/get_project', {
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });
    return response.data;
}

export async function postProject({ metadata, file }) {
    const formData = new FormData();
    formData.append('userID', metadata.userID);
    formData.append('insertDate', metadata.insertDate);
    formData.append('updateDate', metadata.updateDate);
    formData.append('userName', metadata.userName);
    formData.append('file', file);

    const response = await axios.post(SERVER_ENDPOINT+'api/upload_project', formData, {
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });
    return response.data;
}

export async function getProject({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_project/${project_id}`, {
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });
    return response.data;
}

export async function getPdf({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_pdf/${project_id}`, { 
      responseType: 'blob',
      headers: {
        "ngrok-skip-browser-warning": "69420",
      }
    });
    return response.data;
}

export async function getTableOfContents({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_toc/${project_id}`, {
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });
    return response.data;
}

export async function getMatchParagraphs({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_matched_paragraphs/${project_id}`, {
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });
    return response.data;
}

export async function getTranscription({queryKey}: {queryKey: string[]}) {
  const [_key, project_id] = queryKey;
  const response = await axios.get(SERVER_ENDPOINT+`api/get_transcription/${project_id}`, {
      headers: {
          "ngrok-skip-browser-warning": "69420",
      }
  });
  return response.data;
}

export async function getPageInfo({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_page_info/${project_id}`, {
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });
    return response.data;
}

export async function getKeywords({queryKey}: {queryKey: string[]}) {
    const [_key, project_id, page_num] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_keyword/${project_id}`, {
        params: {
            page_num: page_num
        },
        headers: {
            "ngrok-skip-browser-warning": "69420",
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
        },
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });
    return response.data;
}

export async function getSemanticSearchSets({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_search_sets/${project_id}`, {
        params: {
            search_type: 'semantic'
        },
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });
    return response.data;
}

export async function removeSearchResult({ queryKey }: { queryKey: string[] }) {
  const [_key, project_id, search_id, search_type] = queryKey;
  const response = await axios.post(
    SERVER_ENDPOINT + `api/remove_search_result/${project_id}/${search_id}/${search_type}`,
    {
      headers: {
        "ngrok-skip-browser-warning": "69420",
      },
    }
  );
  return response.data;
}

export async function getKeywordSearchSets({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT+`api/get_search_sets/${project_id}`, {
        params: {
            search_type: 'keyword'
        },
        headers: {
          "ngrok-skip-browser-warning": "69420",
        }
    });
    return response.data;
}

export async function getBbox({queryKey}: {queryKey: string[]}) {
    const [_key, project_id, page_num] = queryKey;
    const response = await axios.get(`${SERVER_ENDPOINT}api/get_bbox/${project_id}`, {
        params: {
            page_num: page_num
        },
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });
    return response.data;
}

export async function getRecording({ queryKey }: { queryKey: string[] }) {
    const [_key, project_id] = queryKey;
    const response = await axios.get(SERVER_ENDPOINT + `api/get_recording/${project_id}`, {
        responseType: 'blob',
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });

    // URL.createObjectURL을 통해 blob을 다룰 수 있는 객체 URL을 만듭니다.
    const audioUrl = URL.createObjectURL(response.data);

    return audioUrl;
}

export async function getProsody({queryKey}: {queryKey: string[]}) {
    const [_key, project_id] = queryKey;
    console.log(SERVER_ENDPOINT+`api/get_prosody/${project_id}`);
    const response = await axios.get(SERVER_ENDPOINT+`api/get_prosody/${project_id}`, {
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });
    console.log(response.data);
    return response.data;
}

export async function getRawImages(projectId: string) {
  const response = await axios.get(`${SERVER_ENDPOINT}api/get_images/${projectId}`, {
      params: {
          image_type: 'raw'
      },
      headers: {
          "ngrok-skip-browser-warning": "69420",
      }
  });
  return response.data; // {image: str, dimensions: [number, number]}[]
}

export async function getAnnotatedImages(projectId: string) {
  const response = await axios.get(`${SERVER_ENDPOINT}api/get_images/${projectId}`, {
      params: {
          image_type: 'annotated'
      },
      headers: {
          "ngrok-skip-browser-warning": "69420",
      }
  });
    return response.data; // 이 데이터는 Base64로 인코딩된 이미지들의 배열입니다.
}

export async function getMissedAndImportantParts(projectId: string) {
    const response_missed = await axios.get(`${SERVER_ENDPOINT}api/get_missed_parts/${projectId}`, {
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });
    const response_important = await axios.get(`${SERVER_ENDPOINT}api/get_important_parts/${projectId}`, {
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });

    return {missed: response_missed.data, important: response_important.data};
}

export async function deleteProject(projectId: string) {
    const response = await axios.delete(`${SERVER_ENDPOINT}api/delete_project/${projectId}`, {
        headers: {
            "ngrok-skip-browser-warning": "69420",
        }
    });
    return response.data;
}

export async function lassoQuery(projectId: string, pageNumber: number, prompt: string, image: string, boundingBox: number[], lassoId: number | null) {
  const response = await axios.post(`${SERVER_ENDPOINT}api/lasso_query/`, {
    project_id: projectId,
    page_num: pageNumber,
    prompt_text: prompt,
    image_url: image,
    bbox: boundingBox,
    cur_lasso_id: lassoId,
    headers: {
      "ngrok-skip-browser-warning": "69420",
    }
  });

  return response.data;
}

export async function removeLassoPrompt(projectId: string, prompt: string) {
  const response = await axios.post(`${SERVER_ENDPOINT}api/remove_lasso_prompt/${projectId}`, {
    prompt_text: prompt,
    headers: {
      "ngrok-skip-browser-warning": "69420",
    }
  });

  return response.data;
}

export async function projectPrompts(projectId: string) {
  try {
    const response = await axios.get(`${SERVER_ENDPOINT}api/project_prompts/${projectId}`, {
      headers: {
        "ngrok-skip-browser-warning": "69420",
      }
    });

    return response.data;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function lassoPrompts(projectId: string, pageNumber: number, lassoId: number | null) {
  try {
  const response = await axios.get(`${SERVER_ENDPOINT}api/lasso_prompts/`, {
      params: {
        project_id: projectId,
        page_num: pageNumber,
        lasso_id: lassoId
      },
      headers: {
        "ngrok-skip-browser-warning": "69420",
      }
    });

    return response.data;
  } catch (error) {
    console.log(error);
    [];
  }
}

export async function getLassosOnPage(projectId: string, pageNumber: number) {
  try {
    const response = await axios.get(`${SERVER_ENDPOINT}api/get_lassos_on_page/${projectId}/${pageNumber}`, {
      headers: {
        "ngrok-skip-browser-warning": "69420",
      }
    });
    return response.data;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getLassoInfo(projectId: string, pageNumber: number, lassoId: number | null) {
  try {
    const response = await axios.get(`${SERVER_ENDPOINT}api/get_lasso_info/${projectId}/${pageNumber}/${lassoId}`, {
      headers: {
        "ngrok-skip-browser-warning": "69420",
      }
    });
    return response.data;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function lassoTransform(projectId: string, pageNumber: number, lassoId: number | null, version: number, prompt: string, transformType: string) {
  const response = await axios.post(`${SERVER_ENDPOINT}api/lasso_transform/${projectId}/${pageNumber}/${lassoId}/${version}`, {
    prompt_text: prompt,
    transform_type: transformType,
    headers: {
      "ngrok-skip-browser-warning": "69420",
    }
  });

  return response.data;
}

export async function getLassoAnswer(projectId: string, pageNumber: number, lassoId: number | null, prompt: string, version: number) {
  const response = await axios.get(`${SERVER_ENDPOINT}api/get_lasso_answer/${projectId}/${pageNumber}/${lassoId}`, {
    params: {
      prompt_text: prompt,
      version: version,
    },
    headers: {
      "ngrok-skip-browser-warning": "69420",
    }
  });

  return response.data;
}

export async function getLassoAnswers(projectId: string, pageNumber: number, lassoId: number | null, prompt: string) {
  const response = await axios.get(`${SERVER_ENDPOINT}api/get_lasso_answers/${projectId}/${pageNumber}/${lassoId}`, {
    params: {
      prompt_text: prompt
    },
    headers: {
      "ngrok-skip-browser-warning": "69420",
    }
  });

  return response.data;
}
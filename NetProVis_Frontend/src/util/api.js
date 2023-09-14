import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

export const getPods = async () => axios.get(`${BASE_URL}/get_pods`);

export const activateHPA = async (pod, resource) =>
    axios.post(`${BASE_URL}/activate_hpa`, {selected_pod: JSON.stringify(pod), resource_type: resource})
        .then((res) => {alert(`Activated HPA for ${resource}`)
            return res})
        .catch((err) => alert(`Error while activating HPA for ${resource}`));

export const stopHPA = async (pod, resource) =>
    axios.post(`${BASE_URL}/stop_hpa`, {selected_pod: JSON.stringify(pod), resource_type: resource})
        .then((res) => {alert(`Stopped HPA for ${resource}`)
        return res})
        .catch((err) => alert(`Error while stopping HPA for ${resource}`));

export const deployCNF = async (cnf_name, values) =>
    axios.post(`${BASE_URL}/deploy_cnf`,{cnf: cnf_name, params: JSON.stringify(values)});

export const getTasks = async () => axios.get(`${BASE_URL}/get_tasks`);

import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

export const getPods = () => axios.get(`${BASE_URL}/get_pods`);

export const activateHPA = (pod, resource) =>
    axios.post(`${BASE_URL}/activate_hpa`, {selected_pod: JSON.stringify(pod), resource_type: resource});

export const stopHPA = (pod, resource) =>
    axios.post(`${BASE_URL}/stop_hpa`, {selected_pod: JSON.stringify(pod), resource_type: resource});

export const deployCNF = (cnf_name) =>
    axios.post(`${BASE_URL}/deploy_cnf`,{cnf: cnf_name});

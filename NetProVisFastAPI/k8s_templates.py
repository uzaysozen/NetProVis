HPA_TEMPLATE = {
    "apiVersion": "autoscaling/v2",
    "kind": "HorizontalPodAutoscaler",
    "metadata": {
        "name": ""
    },
    "spec": {
        "scaleTargetRef": {
            "apiVersion": "apps/v1",
            "kind": "",
            "name": ""
        },
        "minReplicas": 1,
        "maxReplicas": 6,
        "metrics": []
    }
}

"""
Lens - Heatmap Visualizer
----------------------------
Draws the checked regions on top of the note image, colored green (pass)
or red (fail), so a field officer or bank teller can see exactly which
security feature triggered a flag - the explainability requirement
called out in the submission's evaluation criteria.

Usage:
    from heatmap import draw_heatmap
    draw_heatmap("note.jpg", analysis_result, "note_annotated.jpg")
"""
import cv2


def draw_heatmap(image_path, analysis_result: dict, output_path: str) -> str:
    img = cv2.imread(str(image_path))
    if img is None:
        raise FileNotFoundError(f"Could not read image at {image_path}")

    for name, region in analysis_result["regions"].items():
        x1, y1, x2, y2 = region["bounds_px"]
        color = (0, 200, 0) if region["passed"] else (0, 0, 220)  # BGR: green / red
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

        label = f"{name}: {'OK' if region['passed'] else 'FLAG'} ({region['edge_density']:.3f})"
        label_y = max(y1 - 8, 12)
        cv2.putText(img, label, (x1, label_y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)

    verdict_text = f"Verdict: {analysis_result['verdict']} ({analysis_result['confidence']*100:.0f}%)"
    cv2.putText(img, verdict_text, (10, img.shape[0] - 15), cv2.FONT_HERSHEY_SIMPLEX,
                0.6, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(img, verdict_text, (10, img.shape[0] - 15), cv2.FONT_HERSHEY_SIMPLEX,
                0.6, (20, 20, 20), 1, cv2.LINE_AA)

    cv2.imwrite(str(output_path), img)
    return str(output_path)


if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    from model import analyze_note

    if len(sys.argv) < 2:
        print("Usage: python heatmap.py <path_to_note_image>")
        sys.exit(1)

    image_path = sys.argv[1]
    result = analyze_note(image_path)
    out = draw_heatmap(image_path, result, "note_annotated.jpg")
    print(f"Annotated image saved to {out}")

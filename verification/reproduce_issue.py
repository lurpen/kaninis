import json
import os
from playwright.sync_api import sync_playwright

def test_reproduce_null_y(page):
    # Go to the editor
    page.goto("http://localhost:3000/editor.html")

    # Select Platform tool
    page.click("#tool-platform")

    # Click in the game container to add a platform
    canvas = page.locator("#game-container canvas")
    canvas.click(position={"x": 400, "y": 300})

    # Wait a bit for the object to be added and selected
    page.wait_for_timeout(500)

    # Capture screenshot
    page.screenshot(path="verification/fix_verification.png")

    # Capture data
    level_data_json = page.evaluate("""() => {
        const data = {
            width: parseInt(document.getElementById('level-width').value),
            height: 600,
            platforms: [],
            carrots: [],
            eggs: [],
            mushrooms: [],
            exit: null
        };

        platforms.children.iterate(p => {
            const height = 32 * p.data.scaleY;
            const collisionY = p.y - 38.5 + 17 + height / 2;
            data.platforms.push({ x: p.x, y: collisionY, scaleX: p.data.scaleX, scaleY: p.data.scaleY });
        });

        return data;
    }""")

    print(json.dumps(level_data_json, indent=4))

    for platform in level_data_json['platforms']:
        if platform['y'] is None or (isinstance(platform['y'], float) and platform['y'] != platform['y']): # Check for None or NaN
            print("FAILURE: Found invalid y coordinate")
        else:
            print(f"Platform y coordinate: {platform['y']}")
            print(f"ScaleX: {platform['scaleX']}, ScaleY: {platform['scaleY']}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_reproduce_null_y(page)
        finally:
            browser.close()

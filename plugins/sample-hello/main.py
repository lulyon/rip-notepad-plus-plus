#!/usr/bin/env python3
"""
Sample plugin for ripNotepad++ — demonstrates JSON-RPC 2.0 protocol.

Plugin lifecycle:
1. ripNotepad++ spawns this script as a sidecar process
2. Communicates via JSON-RPC 2.0 over stdin/stdout
3. Plugin reads requests from stdin line by line
4. Plugin writes responses to stdout line by line
5. Stderr goes to the editor's log

Supported methods:
- ping        → returns "pong"
- getInfo     → returns plugin info
- echo        → returns the input params
- shutdown    → exits gracefully
"""

import sys
import json
import os


def send_response(id_val, result=None, error=None):
    """Send a JSON-RPC 2.0 response to stdout."""
    response = {"jsonrpc": "2.0", "id": id_val}
    if error:
        response["error"] = error
    else:
        response["result"] = result
    sys.stdout.write(json.dumps(response) + "\n")
    sys.stdout.flush()


def handle_request(request):
    """Handle a single JSON-RPC 2.0 request."""
    method = request.get("method", "")
    params = request.get("params")
    req_id = request.get("id")

    if method == "ping":
        return send_response(req_id, result="pong")

    elif method == "getInfo":
        return send_response(req_id, result={
            "name": "sample-hello",
            "version": "1.0.0",
            "description": "A hello world sample plugin",
            "author": "ripNotepad++ Team",
        })

    elif method == "echo":
        return send_response(req_id, result=params)

    elif method == "shutdown":
        send_response(req_id, result="ok")
        sys.exit(0)

    elif method == "getActiveFile":
        # Placeholder: would receive actual file info from editor
        return send_response(req_id, result={
            "path": None,
            "language": "unknown",
            "lineCount": 0,
        })

    elif method == "insertText":
        # Placeholder: would insert text into editor
        return send_response(req_id, result={"inserted": True})

    else:
        return send_response(req_id, error={
            "code": -32601,
            "message": f"Method not found: {method}",
        })


def main():
    """Main loop: read JSON-RPC requests from stdin."""
    # Signal ready by writing nothing — editor detects process started
    sys.stderr.write("sample-hello plugin started\n")
    sys.stderr.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError as e:
            sys.stderr.write(f"Invalid JSON: {e}\n")
            continue

        # Handle notification (no id)
        if "id" not in request or request.get("id") is None:
            method = request.get("method", "")
            if method == "shutdown":
                sys.exit(0)
            # Other notifications are silently acknowledged
            continue

        handle_request(request)


if __name__ == "__main__":
    main()

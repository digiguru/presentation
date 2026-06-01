# Presentation Management

This document describes how to maintain the `presentations.yml` registry when adding new presentations.

## File Format

The `presentations.yml` file tracks all presentations. Each entry contains:

- **name**: The presentation title (extracted from the HTML `<title>` tag or first heading)
- **version**: Semantic version following the pattern `vX.Y`:
  - `X` = Last digit of the year (3=2023, 4=2024, 5=2025, etc.)
  - `Y` = Sequential index of presentations in that year (first talk = .1, second = .2, etc.)
- **date**: When the presentation was given (format: DD/MM/YYYY)
- **url**: The HTML filename 
- **attendance**: Number of attendees (use `?` if unknown)

## When Adding a New Presentation

### Step 1: Create the HTML file
Create the presentation HTML file in the root directory (e.g., `event-name.html`)

### Step 2: Update presentations.yml
Add a new entry to `presentations.yml`:

1. Extract the title from the HTML file's `<title>` tag
2. Determine the version number:
   - Check the last year number in existing presentations
   - If this is the first talk of a new year, increment X to the last digit of the current year
   - Set Y to the next sequential number for that year
3. Extract the presentation date:
   - Look for a date in the HTML content (format: DD/MM/YYYY)
   - If not found, use the git commit date when the file was created
4. Set the URL to the HTML filename
5. Set attendance to `?` if unknown (you can update this later with actual numbers)

### Step 3: Sort the entries
Keep presentations sorted by date (oldest first) within each year group.

## Example: Adding a New 2025 Presentation

If you're adding the second talk of 2025 given on 15/06/2025:

```yaml
- name: My New Talk
  version: v5.2
  date: 15/06/2025
  url: my-new-talk.html
  attendance: ?
```

Then update to actual attendance when you have that information.

## Missing Data

When auditing the file, check for:
- Entries with `attendance: ?` that now have known attendance numbers
- Incorrect or missing dates
- Titles that don't match the actual presentation name
- Duplicate version numbers for the same year

Run the audit script to identify gaps:
```bash
grep "attendance: ?" presentations.yml | wc -l
```

This counts how many presentations are missing attendance data.

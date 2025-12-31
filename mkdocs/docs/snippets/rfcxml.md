# RFCXML

The following snippets are available for insertion in a RFCXML document.

Placeholders are denoted as `${N:Placeholder Name}` and can be edited after insertion. Use ++tab++ to move to the next placeholder.

## Author Block

```xml
<author fullname="${1:Full Name}" initials="${2:Initials}" surname="${3:Surname}">
  <organization>${4:Organization}</organization>
  <address>
    <postal>
      <country>${5:Country Name}</country>
    </postal>
    <email>${6:Email Address}</email>
  </address>
</author>
```

## Date Element

```xml
<date day="${1:$CURRENT_DATE}" month="${2:$CURRENT_MONTH_NAME}" year="${3:$CURRENT_YEAR}" />
```

## Table

This snippet is generated dynamically based on the answers to the following prompts:

- Include a table header row?
- How many columns to generate?
- How many rows to generate?

!!! example
    A table including a header row, with 3 columns and 2 rows:
    ```xml
    <table>
      <thead>
        <tr>
          <th>${1:Header 1 Name}</th>
          <th>${2:Header 2 Name}</th>
          <th>${3:Header 3 Name}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${4:Cell 4 Value}</td>
          <td>${5:Cell 5 Value}</td>
          <td>${6:Cell 6 Value}</td>
        </tr>
        <tr>
          <td>${7:Cell 7 Value}</td>
          <td>${8:Cell 8 Value}</td>
          <td>${9:Cell 9 Value}</td>
        </tr>
      </tbody>
    </table>
    ```
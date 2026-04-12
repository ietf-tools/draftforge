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

## Reference - Generic

```xml
<reference anchor="${1:Citation Tag}" target="${2:URL}">
  <front>
    <title>${3:Title}</title>
    <author initials="" surname="" fullname="">
      <organization />
    </author>
    <date month="${4:$CURRENT_MONTH_NAME}" year="${5:$CURRENT_YEAR}"/>
  </front>
  <seriesInfo name="${6:Name}" value="${7:Value}"/>
  <seriesInfo name="DOI" value="${8:Value}"/>
</reference>
```

## Reference - RFC

```xml
<reference anchor="RFC${1:YYYY}" target="https://www.rfc-editor.org/info/rfc${1:YYYY}">
  <front>
    <title>${2:Title}</title>
    <author initials="" surname="" fullname="">
      <organization />
    </author>
    <date month="${3:$CURRENT_MONTH_NAME}" year="${4:$CURRENT_YEAR}"/>
  </front>
  <seriesInfo name="RFC" value="${1:YYYY}"/>
  <seriesInfo name="DOI" value="10.17487/RFC${1:YYYY}"/>
</reference>
```

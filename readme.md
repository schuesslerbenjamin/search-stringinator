# Search-Stringinator
A small tool that allows to search in selected scientific databases and to apply selected publication filters.

Currently supported databases:
* Scopus
* EbscoHost
* ProQuest
* ACM Digital Library

Currently supported publication filters:
* [Senior Scholars' List of Premier Journals](https://aisnet.org/page/SeniorScholarListofPremierJournals)
* [VHB Publication Media Rating 2024 for Information Systems](https://www.vhbonline.org/verband/wissenschaftliche-kommissionen/wirtschaftsinformatik/vhb-rating-2024-wirtschaftsinformatik)

## Self Hosting the Docker Container
```
docker build -t search-stringinator .
docker run -p 8080:80 search-stringinator
```



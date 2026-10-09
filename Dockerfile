# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY ["ChatBoatAI.csproj", "./"]
RUN dotnet restore "ChatBoatAI.csproj"

# Copy all project files and publish Release build
COPY . .
RUN dotnet publish "ChatBoatAI.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Configure port (Render defaults to 8080)
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ChatBoatAI.dll"]
